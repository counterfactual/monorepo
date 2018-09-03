import { Context } from "../../src/state";
import { CfOpUpdate } from "../../src/middleware/cf-operation/cf-op-update";
import { CfOpSetup } from "../../src/middleware/cf-operation/cf-op-setup";
import {
	CounterfactualVM,
	CfVmConfig,
	Response,
	ResponseStatus
} from "../../src/vm";
import { CfState } from "../../src/state";
import {
	StateChannelInfos,
	AppChannelInfos,
	OpCodeResult,
	ResponseSink,
	AppChannelInfo,
	StateChannelInfo,
	ClientMessage,
	ChannelStates,
	InternalMessage
} from "../../src/types";
import { CfVmWal, MemDb, SyncDb } from "../../src/wal";
import { IoProvider } from "./ioProvider";
import { Instruction } from "../../src/instructions";
import { EthCfOpGenerator } from "../../src/middleware/cf-operation/cf-op-generator";

export class TestWallet implements ResponseSink {
	vm: CounterfactualVM;
	io: IoProvider;
	private requests: Map<string, Function>;

	constructor(readonly address: string, db?: SyncDb, states?: ChannelStates) {
		this.vm = new CounterfactualVM(
			new CfVmConfig(
				this,
				new EthCfOpGenerator(),
				new CfVmWal(db !== undefined ? db : new MemDb()),
				states
			)
		);
		this.io = new IoProvider();
		this.io.ackMethod = this.vm.startAck.bind(this.vm);
		this.requests = new Map<string, Function>();
		this.registerMiddlewares();
	}

	private registerMiddlewares() {
		this.vm.register(Instruction.OP_SIGN, signMyUpdate.bind(this));
		this.vm.register(Instruction.IO_SEND, this.io.ioSendMessage.bind(this.io));
		this.vm.register(Instruction.IO_WAIT, this.io.waitForIo.bind(this.io));
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
		if (this.requests[res.requestId] !== undefined) {
			let promise = this.requests[res.requestId];
			delete this.requests[res.requestId];
			promise(res);
		}
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
