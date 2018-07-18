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
export let Instructions = {
	update: [
		["generateOp", "update"],
		["signMyUpdate"],
		["IoSendMessage"],
		["waitForIo"],
		["validateSignatures"],
		["returnSuccess"]
	],
	updateAck: [
		["waitForIo"],
		["generateOp"],
		["validateSignatures"],
		["signMyUpdate"],
		["IoSendMessage"],
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
	setupAck: [
		["waitForIo"],
		["generateOp", "setupNonce"],
		["validateSignatures"],
		["generateOp", "setupFreeBalance"],
		["validateSignatures"], // @igor we could also  do validate in one step
		["signMyUpdate"],
		["IoSendMessage"],
		["returnSuccess"]
	]
};
/*
let Instructions = {
	update: ['generateOp', 'signMyUpdate', 'validate',
'IoSendMessage', 'waitForAllSignatures', 'validate', 'returnSuccess'],
}
*/

export class CounterfactualVM {
	requests: any;
	middlewares: { method: Function; scope: string }[];
	stateChannelInfos: StateChannelInfos;
	appChannelInfos: AppChannelInfos;
	wallet: ResponseSink;
	cfState: CfState;

	constructor(wallet: ResponseSink) {
		this.requests = {};
		this.middlewares = [];
		this.stateChannelInfos = Object.create(null);
		let stateChannel = new StateChannelInfoImpl();
		this.wallet = wallet;
		this.stateChannelInfos.sampleMultisig = stateChannel;

		this.appChannelInfos = Object.create(null);
		let appChannel = new AppChannelInfoImpl();
		appChannel.id = "someAppId";
		appChannel.stateChannel = stateChannel;
		stateChannel.appChannels.someAppId = appChannel;
		this.appChannelInfos.someAppId = appChannel;
		this.cfState = new CfState(this.stateChannelInfos);
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
