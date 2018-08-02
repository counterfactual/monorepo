import { Context } from "../../src/state";
import { CfOpUpdate } from "../../src/middleware/cf-operation/cf-op-update";
import { CfOpSetup } from "../../src/middleware/cf-operation/cf-op-setup";
import { CounterfactualVM, Response, InternalMessage } from "../../src/vm";
import { CfState } from "../../src/state";
import {
	StateChannelInfos,
	AppChannelInfos,
	OpCodeResult,
	ResponseSink,
	AppChannelInfo,
	StateChannelInfo,
	ClientMessage,
	FreeBalance,
	ChannelStates
} from "../../src/types";
import { IoProvider } from "./ioProvider";
import { Instruction } from "../../src/instructions";

export class TestWallet implements ResponseSink {
	vm: CounterfactualVM;
	io: IoProvider;
	private requests: Map<string, Function>;

	constructor(readonly address: string) {
		this.vm = new CounterfactualVM(this);
		this.io = new IoProvider();
		this.io.ackMethod = this.vm.startAck.bind(this.vm);
		this.requests = new Map<string, Function>();
		this.registerMiddlewares();
	}

	/**
	 * Reconstructs the vm state to the given ChannelStates.
	 */
	initState(states: ChannelStates) {
		this.vm.initState(states);
	}

	private registerMiddlewares() {
		this.vm.register(Instruction.ALL, log.bind(this));
		this.vm.register(Instruction.OP_SIGN, signMyUpdate.bind(this));
		this.vm.register(Instruction.IO_SEND, this.io.ioSendMessage.bind(this.io));
		this.vm.register(Instruction.IO_WAIT, this.io.waitForIo.bind(this.io));
		// todo: @igor we shouldn't have to call this manually
		this.vm.setupDefaultMiddlewares();
	}

	/**
	 * The test will call this when it wants to start a protocol.
	 * Returns a promise that resolves with a Response object when
	 * the protocol has completed execution.
	 */
	async runProtocol(msg: ClientMessage): Promise<Response> {
		let promise = new Promise<Response>((resolve, reject) => {
			this.requests[msg.requestId] = resolve;
		});
		let response = this.vm.receive(msg);
		return promise;
	}

	/**
	 * Resolves the registered promise so the test can continue.
	 */
	sendResponse(res: Response) {
		this.requests[res.requestId](res);
	}

	/**
	 * Called When a peer wants to send an io messge to this wallet.
	 */
	receiveMessageFromPeer(incoming: ClientMessage) {
		console.log("Receive from peer: ", incoming.action, incoming.seq);
		this.io.receiveMessageFromPeer(incoming);
	}
}

/**
 * Plugin middleware methods.
 */

async function signMyUpdate(message: InternalMessage, next: Function) {
	return { signature: "fake sig", data: { something: "hello" } };
}

async function validateSignatures(
	message: InternalMessage,
	next: Function,
	context
) {
	let incomingMessage = getFirstResult(Instruction.IO_WAIT, context.results);
	let op = getFirstResult(Instruction.OP_GENERATE, context.results);
	// do some magic here
}

async function log(message: InternalMessage, next: Function, context: Context) {
	//console.log("message", message);
	let result = await next();
	//console.log("result", result);
	return result;
}

/**
 * Utilitiy for middleware to access return values of other middleware.
 */
export function getFirstResult(
	toFindOpCode: Instruction,
	results: { value: any; opCode }[]
): OpCodeResult {
	// FIXME: (ts-strict) we should change the results data structure or design
	// @ts-ignore
	return results.find(({ opCode, value }) => opCode === toFindOpCode);
}
