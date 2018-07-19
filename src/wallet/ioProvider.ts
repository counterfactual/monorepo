import { IoMessage } from "../machine/types";
import { InternalMessage } from "../machine/vm";
import { Context } from "../machine/state";
import { getFirstResult } from "./wallet";

export class IoProvider {
	messages: IoMessage[];
	// TODO Refactor this into using an EventEmitter class so we don't do
	// this manually
	listeners: { appId: string; multisig: string; seq: number; method: Function }[];
	fallThroughListeners: { appId: string; multisig: string; seq: number; method: Function }[];

	constructor() {
		// setup websockets
		this.messages = [];
		this.listeners = [];
		this.fallThroughListeners = [];
	}

	receiveMessageFromPeer(message: IoMessage) {
		let done = false;
		this.listeners.forEach(listener => {
			if (
				listener.appId === message.appId ||
				(!listener.appId && listener.multisig === message.multisig) ||
				(!listener.appId && listener.multisig === message.multisig)
			) {
				listener.method(message);
				done = true;
			}
		});
		if (!done) {
			this.fallThroughListeners.forEach(listener => {
				if (listener.seq === message.seq) {
					listener.method(message);
					done = true;
				}
			});
		}
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


	listenOnce(method: Function, multisig?: string, appId?: string, seq?: number) {
		if (!multisig && !appId && !seq) {
			throw "Must specify either a multisig or appId or sequence";
		}
		let message = this.findMessage(multisig, appId);
		if (!message) {
			this.listeners.push({ appId, multisig, method, seq });
		} else {
			this.messages.splice(this.messages.indexOf(message), 1);
			method(message);
		}
	}

	// catches anything that is not caught by listenOnce
	listen(method: Function, multisig?: string, appId?: string, seq?: number) {
		this.fallThroughListeners.push({ method, seq, multisig, appId });
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
		let appChannel;
		if (this.needsAppId(message)) {
			appChannel = context.appChannelInfos[message.clientMessage.appId];
			appChannelId = appChannel.id; 
		}
		let stateChannel = message.clientMessage.stateChannel || appChannel.stateChannel;

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
