import { Context } from "../../src/state";
import { CfOpUpdate } from "../../src/cf-operation/cf-op-update";
import { CfOpSetup } from "../../src/cf-operation/cf-op-setup";
import {
	CfState,
	CounterfactualVM,
	Response,
	InternalMessage
} from "../../src/vm";
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

export class TestWallet implements ResponseSink {
	vm: CounterfactualVM;
	io: IoProvider;
	private requests: Map<string, Function>;

	constructor(readonly address: string) {
		this.vm = new CounterfactualVM(this);
		this.io = new IoProvider();
		this.requests = new Map<string, Function>();
		this.registerMiddlewares();
		this.startListening();
	}

	startListening() {
		this.io.listen(
			(message: ClientMessage) => {
				this.vm.startAck(message);
			},
			null,
			null,
			1
		);
	}

	initState(states: ChannelStates) {
		this.vm.initState(states);
	}

	private registerMiddlewares() {
		this.vm.register("*", log.bind(this));
		this.vm.register("signMyUpdate", signMyUpdate.bind(this));
		this.vm.register("IoSendMessage", this.io.ioSendMessage.bind(this.io));
		this.vm.register("waitForIo", this.io.waitForIo.bind(this.io));
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

	receiveMessageFromPeer(incoming: ClientMessage) {
		this.io.receiveMessageFromPeer(incoming);
	}
}

async function signMyUpdate(message: InternalMessage, next: Function) {
	return { signature: "fake sig", data: { something: "hello" } };
}

async function validateSignatures(
	message: InternalMessage,
	next: Function,
	context
) {
	let incomingMessage = getFirstResult("waitForIo", context.results);
	let op = getFirstResult("generateOp", context.results);
	// do some magic here
}

export function getFirstResult(
	toFindOpCode: string,
	results: { value: any; opCode }[]
): OpCodeResult {
	return results.find(({ opCode, value }) => opCode === toFindOpCode);
}

async function log(message: InternalMessage, next: Function, context: Context) {
	//console.log("message", message);
	let result = await next();
	//console.log("result", result);
	return result;
}
