import { ClientMessage } from "../../src/types";
import { InternalMessage, getFirstResult, getLastResult } from "../../src/vm";
import { Context } from "../../src/state";
import { TestWallet } from "./wallet";
import { Instruction } from "../../src/instructions";

export class IoProvider {
	messages: ClientMessage[];
	peer: TestWallet;
	// TODO Refactor this into using an EventEmitter class so we don't do
	// this manually
	listeners: {
		appId: string;
		multisig: string;
		seq: number;
		method: Function;
	}[];

	/**
	 * Called when receivng a message with seqno = 1.
	 */
	ackMethod: Function;

	constructor() {
		// setup websockets
		this.messages = [];
		this.listeners = [];
	}

	receiveMessageFromPeer(message: ClientMessage) {
		let done = false;
		let executedListeners = [];
		let count = 0;

		// invoke all listeners waiting for a response to resolve their promise
		this.listeners.forEach(listener => {
			if (
				listener.appId === message.appId ||
				(!listener.appId && listener.multisig === message.multisigAddress)
			) {
				listener.method(message);
				done = true;
				executedListeners.push(count++);
			}
		});
		// now remove all listeners we just invoked
		executedListeners.forEach(index => this.listeners.splice(index, 1));

		// initiate ack side if needed
		if (message.seq === 1) {
			this.ackMethod(message);
			done = true;
		}
		if (!done) {
			this.messages.push(message);
		}
	}

	findMessage(multisig?: string, appId?: string): ClientMessage {
		let message: ClientMessage;
		if (appId) {
			message = this.messages.find(m => m.appId === appId);
		} else {
			message = this.messages.find(m => m.multisigAddress === multisig);
		}
		return message;
	}

	listenOnce(
		method: Function,
		multisig?: string,
		appId?: string,
		seq?: number
	) {
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

	listen(method: Function, multisig?: string, appId?: string, seq?: number) {
		this.ackMethod = method;
	}

	async ioSendMessage(
		internalMessage: InternalMessage,
		next: Function,
		context: Context
	) {
		let msg = getLastResult(Instruction.IO_PREPARE_SEND, context.results);
		this.peer.receiveMessageFromPeer(msg.value);
	}

	private needsAppId(message: InternalMessage) {
		return message.actionName !== "setup";
	}

	async waitForIo(
		message: InternalMessage,
		next: Function
	): Promise<ClientMessage> {
		// has websocket received a message for this appId/multisig
		// if yes, return the message, if not wait until it does
		let resolve: Function;
		let promise = new Promise<ClientMessage>(r => (resolve = r));

		let multisig = null;
		let appId = null;

		if (message.actionName === "setup" || message.actionName === "install") {
			multisig = message.clientMessage.multisigAddress;
		} else {
			appId = message.clientMessage.appId;
		}

		this.listenOnce(
			message => {
				resolve(message);
			},
			multisig,
			appId
		);
		return promise;
	}
}
