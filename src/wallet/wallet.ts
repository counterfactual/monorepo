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

export class CfWallet implements ResponseSink {
	private vm: CounterfactualVM;
	private ioProvider: IoProvider;

	constructor() {
		this.vm = new CounterfactualVM(this);
		this.ioProvider = new IoProvider();
		this.registerMiddlewares();
	}

	private registerMiddlewares() {
		this.vm.register("*", async function logger(message, next) {
			console.log("message", message);
			let result = await next();
			console.log("result", result);
			return result;
		});

		this.vm.register("signMyUpdate", async function signMyUpdate(
			message: InternalMessage,
			next: Function
		) {
			console.log(message);
			return { signature: "hi", data: { something: "hello" } };
		});

		this.vm.register("validateSignatures", async function validateSignatures(
			message: InternalMessage,
			next: Function,
			context
		) {
			let incomingMessage = getFirstResult("waitForIo", context.results);
			let op = getFirstResult("generateOp", context.results);
			// do some magic here
			console.log(message);
		});

		this.vm.register(
			"IoSendMessage",
			this.ioProvider.ioSendMessage.bind(this.ioProvider)
		);

		this.vm.register(
			"waitForIo",
			this.ioProvider.waitForIo.bind(this.ioProvider)
		);

		this.vm.setupDefaultMiddlewares();
	}

	receive(msg: ClientMessage) {
		this.vm.receive(msg);
	}

	sendResponse(res: Response) {
		console.log("sending response", res);
	}

	receiveMessageFromPeer(incoming: IoMessage) {
		this.ioProvider.receiveMessageFromPeer(incoming);
	}
}

class IoProvider {
	messages: IoMessage[];
	// TODO Refactor this into using an EventEmitter class so we don't do
	// this manually
	listeners: { appId: string; multisig: string; method: Function }[];

	constructor() {
		// setup websockets
		this.messages = [];
		this.listeners = [];
	}

	receiveMessageFromPeer(message: IoMessage) {
		let done = false;
		this.listeners.forEach(listener => {
			if (
				listener.appId === message.appId ||
				(!listener.appId && listener.multisig === message.multisig)
			) {
				listener.method(message);
				done = true;
			}
		});
		if (!done) {
			this.messages.push(message);
		}
	}

	findMessage(multisig?: string, appId?: string): IoMessage {
		let message: IoMessage;
		if (appId) {
			message = this.messages.find(m => m.appId === appId);
		} else {
			message = this.messages.find(m => m.multisig === multisig);
		}
		return message;
	}

	listenOnce(method: Function, multisig?: string, appId?: string) {
		if (!multisig && !appId) {
			throw "Must specify either a multisig or appId";
		}
		let message = this.findMessage(multisig, appId);
		if (!message) {
			this.listeners.push({ appId, multisig, method });
		} else {
			this.messages.splice(this.messages.indexOf(message), 1);
			method(message);
		}
	}

	/*
	each channel messsage is composed of four parts
	1. Channel/AppChannel info that is generated from the context
	2. Body which is the payload provided by the incoming message
	3. Signatures, etc. provided by the VM runtime
	4. Sequence - counter of where in the handshake we are
	*/
	async ioSendMessage(
		message: InternalMessage,
		next: Function,
		context: Context
	) {
		let appChannelId = "";
		let stateChannel =
			context.stateChannelInfos[message.clientMessage.multisigAddress];
		if (this.needsAppId(message)) {
			appChannelId = context.appChannelInfos[message.clientMessage.appId].id;
		}

		let channelPart = {
			appId: appChannelId,
			multisig: stateChannel.multisigAddress,
			to: stateChannel.toAddress,
			from: stateChannel.fromAddress
		};

		let seq = { seq: context.instructionPointer };
		let body = { body: message.clientMessage.data };
		let signatures = {
			signatures: [getFirstResult("signMyUpdate", context.results).value]
		};
		let io = Object.assign({}, channelPart, seq, body, signatures);
		console.log(context);
		console.log("Pretending to send Io to", io, " with data ");
		return io;
	}

	private needsAppId(message: InternalMessage) {
		return message.actionName !== "setup";
	}

	async waitForIo(
		message: InternalMessage,
		next: Function
	): Promise<IoMessage> {
		// has websocket received a message for this appId/multisig
		// if yes, return the message, if not wait until it does
		console.log(message);
		let resolve: Function;
		let promise = new Promise<IoMessage>(r => (resolve = r));

		let multisig = null;
		let appId = null;
		if (message.actionName === "setup") {
			multisig = message.clientMessage.multisigAddress;
		} else {
			appId = message.clientMessage.appId;
		}

		this.listenOnce(
			message => {
				console.log("it works with msg", message);
				resolve(message);
			},
			multisig,
			appId
		);
		return promise;
	}
}

function getFirstResult(
	toFindOpCode: string,
	results: { value: any; opCode }[]
): OpCodeResult {
	return results.find(({ opCode, value }) => opCode === toFindOpCode);
}
