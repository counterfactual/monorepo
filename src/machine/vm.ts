import { ActionExecution, Action } from "./action";
import {
	IoMessage,
	StateChannelInfos,
	AppChannelInfos,
	ChannelStates,
	NetworkContext,
	OpCodeResult,
	ResponseSink,
	AppChannelInfo,
	StateChannelInfo,
	ClientMessage,
	FreeBalance
} from "./types";
import { CfOpUpdate } from "./cf-operation/cf-op-update";
import { CfOpSetup } from "./cf-operation/cf-op-setup";
(Symbol as any).asyncIterator =
	Symbol.asyncIterator || Symbol.for("Symbol.asyncIterator");

import { AppChannelInfoImpl, StateChannelInfoImpl, Context } from "./state";
import { stat } from "fs";
export let Instructions = {
	update: [
		["generateOp", "update"],
		["signMyUpdate"],
		["IoSendMessage"],
		["waitForIo"],
		["validateSignatures"],
		["returnSuccess"]
	],
	setup: [
		["generateOp", "setupNonce"],
		["signMyUpdate"],
		["generateOp", "setupFreeBalance"],
		["signMyUpdate"],
		["IoSendMessage"],
		["waitForIo"],
		["validateSignatures"],
		["returnSuccess"]
	],
}

export let AckInstructions = {
	update: [
		["generateOp"],
		["validateSignatures"],
		["signMyUpdate"],
		["IoSendMessage"],
		["returnSuccess"]
	],
	/*
	setup: [
		["waitForIo"],
		["generateOp", "setupNonce"],
		["validateSignatures"],
		["generateOp", "setupFreeBalance"],
		["validateSignatures"], // @igor we could also  do validate in one step
		["signMyUpdate"],
		["IoSendMessage"],
		["returnSuccess"]
	]
	*/
};
/*
let Instructions = {
	update: ['generateOp', 'signMyUpdate', 'validate',
'IoSendMessage', 'waitForAllSignatures', 'validate', 'returnSuccess'],
}
*/
interface Addressable {
	appId?: string,
	multisigAddress?: string,
	toAddress?: string,
	fromAddress?: string
}

export class CounterfactualVM {
	requests: any;
	middlewares: { method: Function; scope: string }[];
	// TODO cleanup and have a single source of truth between cfState and state/appChannel infos
	// we should make appchanelinfos a helper method
	stateChannelInfos: StateChannelInfos;
	wallet: ResponseSink;
	cfState: CfState;

	constructor(wallet: ResponseSink) {
		this.requests = {};
		this.middlewares = [];
		this.stateChannelInfos = Object.create(null);
		let stateChannel = new StateChannelInfoImpl();
		this.wallet = wallet;
		this.cfState = new CfState(this.stateChannelInfos);
	}

	get appChannelInfos(): AppChannelInfos {
		let infos = {};
		for (let channel of Object.keys(this.cfState.channelStates))	{
			for (let appChannel of Object.keys(this.cfState.channelStates[channel].appChannels)) {
				infos[appChannel] = this.cfState.channelStates[channel].appChannels[appChannel];
			}
		}
		return infos;
	}

	startAck(message: IoMessage) {
		let request = new Action(null, message.protocol, this.ioMessageToClientMessage(message), true);
		this.processRequest(request);
	}

	// TODO fix/make nice
	generateRandomId(): string {
		return '' + Math.random();
	}

	// TODO add support for not appID
	getStateChannelFromAddressable(data: Addressable): StateChannelInfo {
		if (data.appId) {
			return this.appChannelInfos[data.appId].stateChannel;
		}
	}

	// This is a bit weird, I think the layering here is not 100% correct,
	// want to refactor but need to think about it for a bit/refactor later
	ioMessageToClientMessage(msg: IoMessage): ClientMessage {
		let clientMessage = {};
		let requestId = this.generateRandomId();

		let stateChannel = this.getStateChannelFromAddressable(msg);
		// TODO Clean this up once we know more about how actions map to protocols
		let action = msg.protocol;
		return Object.assign({}, { requestId, stateChannel, action, data: msg.body }, msg);
	}

	initState(state: ChannelStates) {
		// TODO make this more robust/go through a nice method
		Object.assign(this.cfState.channelStates, state);
	}

	setupDefaultMiddlewares() {
		this.register(
			"returnSuccess",
			async (message: InternalMessage, next: Function, context: Context) => {
				let appChannelInfo = {};
				if (message.actionName !== "setup") {
					let appChannel = context.appChannelInfos[message.clientMessage.appId];
					// TODO add nonce and encoded app state
					let updatedAppChannel: AppChannelInfo = {
						appState: message.clientMessage.data.appState
					};
					let appChannelInfo = { [appChannel.id]: updatedAppChannel };
				}
				let multisig = message.clientMessage.multisigAddress;
				let updatedStateChannel = new StateChannelInfoImpl(
					message.clientMessage.toAddress,
					message.clientMessage.fromAddress,
					multisig,
					appChannelInfo
				);

				return { [multisig]: updatedStateChannel };
			}
		);
		this.register(
			"generateOp",
			async (message: InternalMessage, next: Function) => {
				if (message.actionName === "update") {
					let nonce = 75; // todo
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
					message.actionName === "setup" &&
					message.opCodeArgs[0] === "setupNonce"
				) {
					let nonceUniqueId = 1; // todo
					const op = CfOpSetup.nonceUpdateOp(
						nonceUniqueId,
						message.clientMessage.multisigAddress,
						message.clientMessage.stateChannel.owners(),
						this.cfState.networkContext
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
						this.cfState.networkContext
					);
					return op;
				}
			}
		);
	}

	validateMessage(msg: ClientMessage) {
		return true;
	}

	receive(msg: ClientMessage) {
		this.validateMessage(msg);
		let request = new Action(msg.requestId, msg.action, msg);
		this.requests[request.requestId] = request;
		let response = new Response(request.requestId, "started");
		this.sendResponse(response);
		this.processRequest(request);
	}

	sendResponse(res: Response) {
		this.wallet.sendResponse(res);
	}

	async processRequest(action: Action) {
		let val;
		// TODO deal with errors
		for await (val of action.execute(this)) {
			console.log("processed a step");
		}

		this.mutateState(val);
		// write to the state object
	}

	mutateState(state: ChannelStates) {
		console.log("about to update -------");
		console.log("existing state ", this.cfState.channelStates);
		console.log("new state ", state);
		Object.assign(this.cfState.channelStates, state);
		console.log("updated state after updating ", this.cfState.channelStates);
	}

	register(scope: string, method: Function) {
		this.middlewares.push({ scope, method });
	}
}

export class CfState {
	channelStates: ChannelStates;
	networkContext: NetworkContext;
	constructor(channelStates: ChannelStates) {
		this.channelStates = channelStates;
		// TODO Refactor params to be an an object with prop names
		this.networkContext = new NetworkContext(
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			"9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			"0xaaaabbbb",
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			"0xbbbbaaaa",
			"0x0"
		);
	}
}

export class InternalMessage {
	actionName: string;
	opCode: string;
	opCodeArgs: string[];
	clientMessage: ClientMessage;

	constructor(
		action: string,
		[opCode, ...opCodeArgs]: string[],
		clientMessage: ClientMessage
	) {
		this.actionName = action;
		this.opCode = opCode;
		this.opCodeArgs = opCodeArgs;
		this.clientMessage = clientMessage;
	}
}

export class Response {
	requestId: string;
	status: string;
	error: string;

	constructor(id: string, status: string) {
		this.requestId = id;
		this.status = status;
	}
}
