import { ClientMessage, InternalMessage, ActionName } from "../../src/types";
import { Context } from "../../src/state";
import { TestWallet } from "./wallet";
import { Instruction } from "../../src/instructions";
import { getLastResult } from "../../src/middleware/middleware";

export class IoProvider {
	messages: ClientMessage[];
	peer: TestWallet = Object.create(null);
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
	ackMethod: Function = Object.create(null);

	constructor() {
		// setup websockets
		this.messages = [];
		this.listeners = [];
	}

	receiveMessageFromPeer(message: ClientMessage) {
		let done = false;
		let executedListeners = [] as number[];
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
			// FIXME: these shouldn't be ignored. refactor for type safety
			// @ts-ignore
			message = this.messages.find(m => m.appId === appId);
		} else {
			// @ts-ignore
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
			// FIXME: (ts-strict) refactor for proper argument passing
			// @ts-ignore
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
		// FIXME: (ts-strict) msg should never be null here
		// @ts-ignore
		this.peer.receiveMessageFromPeer(msg.value);
	}

	private needsAppId(message: InternalMessage) {
		return message.actionName !== ActionName.SETUP;
	}

	async waitForIo(
		message: InternalMessage,
		next: Function
	): Promise<ClientMessage> {
		// has websocket received a message for this appId/multisig
		// if yes, return the message, if not wait until it does
		let resolve: Function;
		let promise = new Promise<ClientMessage>(r => (resolve = r));

		let multisig: string = "";
		let appId: string = "";

		if (
			message.actionName === ActionName.SETUP ||
			message.actionName === ActionName.INSTALL
		) {
			multisig = message.clientMessage.multisigAddress;
		} else {
			if (message.clientMessage.appId === undefined) {
				throw "messages other than setup and install must have appId set";
			}
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
