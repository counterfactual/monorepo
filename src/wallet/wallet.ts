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
	vm: CounterfactualVM;
	ioProvider: IoProvider;

	constructor() {
		this.vm = new CounterfactualVM(this);
		let ioProvider = new IoProvider();
		this.ioProvider = ioProvider;
		this.register("*", async function logger(message, next) {
			console.log("message", message);
			let result = await next();
			console.log("result", result);
			return result;
		});

		this.register(
			"generateOp",
			async (message: InternalMessage, next: Function) => {
				if (message.actionName === "update") {
					let nonce = 75;
					const op = CfOpUpdate.operation({
						appId: "non actually needed",
						cfaddress: "some address",
						proposedAppState: "some state",
						moduleUpdateData: "some state",
						metadata: "this goes away with this design",
						nonce
					});
					return op;
				}
				if (
					// @igor let's just use the current cf op structure for now
					// I need to think more about the  general "updateAsOwner"
					// in this context, but I'm running out of time today.
					message.actionName === "setup" &&
					message.opCodeArgs[0] === "setupNonce"
				) {
					let nonceUniqueId = 1; // todo
					const op = CfOpSetup.nonceUpdateOp(
						nonceUniqueId,
						message.clientMessage.multisigAddress,
						message.clientMessage.stateChannel.owners(),
						this.vm.cfState.networkContext
					);
					return op;
				}
				if (
					message.actionName === "setup" &&
					message.opCodeArgs[0] === "setupFreeBalance"
				) {
					let freeBalanceUniqueId = 2; // todo
					let owners = [];
					const op = CfOpSetup.freeBalanceInstallOp(
						freeBalanceUniqueId,
						message.clientMessage.multisigAddress,
						message.clientMessage.stateChannel.owners(),
						this.vm.cfState.networkContext
					);
					return op;
				}
			}
		);

		this.register("signMyUpdate", async function signMyUpdate(
			message: InternalMessage,
			next: Function
		) {
			console.log(message);
			return Promise.resolve({ signature: "hi", data: { something: "hello" } });
		});

		this.register("validateSignatures", async function validateSignatures(
			message: InternalMessage,
			next: Function,
			context
		) {
			let incomingMessage = getFirstResult("waitForIo", context.results);
			let op = getFirstResult("generateOp", context.results);
			// do some magic here

			console.log(message);

			return Promise.resolve();
		});

		this.register("IoSendMessage", ioProvider.IoSendMessage.bind(ioProvider));
		this.register("waitForIo", ioProvider.waitForIo.bind(ioProvider));
		this.vm.setupDefaultMiddlewares();
	}

	register(scope: string, method: Function) {
		this.vm.register(scope, method);
	}

	receive(msg: ClientMessage) {
		this.vm.receive(msg);
	}

	sendResponse(res: Response) {
		console.log("sending response", res);
	}
	receiveMessageFromPeer(incoming) {
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
	async IoSendMessage(
		message: InternalMessage,
		next: Function,
		context: Context
	) {
		// @igor we can't do this for all IoSendMessages
		let appChannel = context.appChannelInfos[message.clientMessage.appId];
		let stateChannel = appChannel.stateChannel;
		let channelPart = {
			appId: appChannel.id,
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

	async waitForIo(
		message: InternalMessage,
		next: Function
	): Promise<IoMessage> {
		// has websocket received a message for this appId/multisig
		// if yes, return the message, if not wait until it does
		console.log(message);
		let resolve: Function;
		let promise = new Promise<IoMessage>(r => (resolve = r));
		this.listenOnce(
			message => {
				console.log("it works with msg", message);
				resolve(message);
			},
			null,
			message.clientMessage.appId
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
