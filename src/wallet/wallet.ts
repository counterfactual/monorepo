import { Context } from "../machine/state";
import { CfOpUpdate } from "../machine/cf-operation/cf-op-update";
import { CfOpSetup } from "../machine/cf-operation/cf-op-setup";
import {
	CfState,
	CounterfactualVM,
	Response,
	InternalMessage
} from "./../machine/vm";
import {
	IoMessage,
	StateChannelInfos,
	AppChannelInfos,
	OpCodeResult,
	ResponseSink,
	AppChannelInfo,
	StateChannelInfo,
	ClientMessage,
	FreeBalance
} from "../machine/types";
import { IoProvider } from "./ioProvider";

export class CfWallet implements ResponseSink {
	private vm: CounterfactualVM;
	private io: IoProvider;

	constructor() {
		this.vm = new CounterfactualVM(this);
		this.io = new IoProvider();
		this.registerMiddlewares();
	}

	private registerMiddlewares() {
		this.vm.register("*", log.bind(this));
		this.vm.register("signMyUpdate", signMyUpdate.bind(this));
		this.vm.register("validateSignatures", validateSignatures.bind(this));
		this.vm.register("IoSendMessage", this.io.ioSendMessage.bind(this.io));
		this.vm.register("waitForIo", this.io.waitForIo.bind(this.io));
		// todo: @igor we shouldn't have to call this manually
		this.vm.setupDefaultMiddlewares();
	}

	receive(msg: ClientMessage) {
		this.vm.receive(msg);
	}

	sendResponse(res: Response) {
		console.log("sending response", res);
	}

	receiveMessageFromPeer(incoming: IoMessage) {
		this.io.receiveMessageFromPeer(incoming);
	}
}

async function signMyUpdate(message: InternalMessage, next: Function) {
	console.log(message);
	return { signature: "hi", data: { something: "hello" } };
}

async function validateSignatures(
	message: InternalMessage,
	next: Function,
	context
) {
	let incomingMessage = getFirstResult("waitForIo", context.results);
	let op = getFirstResult("generateOp", context.results);
	// do some magic here
	console.log(message);
}

async function log(message, next) {
	console.log("message", message);
	let result = await next();
	console.log("result", result);
	return result;
}

export function getFirstResult(
	toFindOpCode: string,
	results: { value: any; opCode }[]
): OpCodeResult {
	return results.find(({ opCode, value }) => opCode === toFindOpCode);
}
