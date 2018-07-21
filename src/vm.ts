import * as ethers from "ethers";
import { ActionExecution, Action } from "./action";
import {
	StateChannelInfos,
	AppChannelInfos,
	ChannelStates,
	NetworkContext,
	OpCodeResult,
	ResponseSink,
	AppChannelInfo,
	StateChannelInfo,
	ClientMessage,
	CfApp,
	FreeBalance,
	PeerBalance
} from "./types";
import { CfOpUpdate } from "./cf-operation/cf-op-update";
import { CfOpSetup } from "./cf-operation/cf-op-setup";
import { CfOpInstall } from "./cf-operation/cf-op-install";
import { CfOpUninstall } from "./cf-operation/cf-op-uninstall";
// @igor this breaks on node 10.0
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
	install: [
		["generateKey"],
		["IoSendMessage"],
		["waitForIo"],
		["generateOp", "install"],
		["validateSignatures"],
		["signMyUpdate"],
		["IoSendMessage"],
		["returnSuccess"]
	],
	uninstall: [
		["generateOp", "uninstall"],
		["signMyUpdate"],
		["IoSendMessage"],
		["waitForIo"],
		["validateSignatures"],
		["returnSuccess"]
	]
};

export let AckInstructions = {
	update: [
		["generateOp"],
		["validateSignatures"],
		["signMyUpdate"],
		["IoSendMessage"],
		["returnSuccess"]
	],
	setup: [
		["generateOp", "setupNonce"],
		["validateSignatures"],
		["generateOp", "setupFreeBalance"],
		["validateSignatures"], // @igor we could also  do validate in one step
		["signMyUpdate"],
		["IoSendMessage"],
		["returnSuccess"]
	],
	install: [
		["generateKey"],
		["generateOp", "install"],
		["signMyUpdate"],
		["IoSendMessage"],
		["waitForIo"],
		["validateSignatures"],
		["returnSuccess"]
	],
	uninstall: [
		["generateOp", "uninstall"],
		["validateSignatures"],
		["signMyUpdate"],
		["IoSendMessage"],
		["waitForIo"],
		["validateSignatures"],
		["returnSuccess"]
	]
};

interface Addressable {
	appId?: string;
	multisigAddress?: string;
	toAddress?: string;
	fromAddress?: string;
}

export class CounterfactualVM {
	requests: any;
	middlewares: { method: Function; scope: string }[];
	// TODO cleanup and have a single source of truth between cfState
	// and state/appChannel infos
	// we should make appchanelinfos a helper method
	stateChannelInfos: StateChannelInfos;
	wallet: ResponseSink;
	cfState: CfState;

	constructor(wallet: ResponseSink) {
		this.requests = {};
		this.middlewares = [];
		this.stateChannelInfos = Object.create(null);
		this.wallet = wallet;
		this.cfState = new CfState(this.stateChannelInfos);
	}

	get appChannelInfos(): AppChannelInfos {
		let infos = {};
		for (let channel of Object.keys(this.cfState.channelStates)) {
			for (let appChannel of Object.keys(
				this.cfState.channelStates[channel].appChannels
			)) {
				infos[appChannel] = this.cfState.channelStates[channel].appChannels[
					appChannel
				];
			}
		}
		return infos;
	}

	startAck(message: ClientMessage) {
		let request = new Action(message.requestId, message.action, message, true);
		this.processRequest(request);
	}

	// TODO fix/make nice
	generateRandomId(): string {
		return "" + Math.random();
	}

	// TODO add support for not appID
	getStateChannelFromAddressable(data: Addressable): StateChannelInfo {
		if (data.appId) {
			return this.appChannelInfos[data.appId].stateChannel;
		}
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
				let freeBalance;
				let multisig = message.clientMessage.multisigAddress;
				if (message.actionName === "update") {
					// todo
					/*
					let appChannel = context.appChannelInfos[message.clientMessage.appId];
					// TODO add nonce and encoded app state
					let updatedAppChannel: AppChannelInfo = {
						appState: message.clientMessage.data.appState
					};
					appChannelInfo = { [appChannel.id]: updatedAppChannel };
					*/
				} else if (message.actionName === "install") {
					let cfAddr = getFirstResult("generateOp", context.results).value
						.cfAddr;
					let existingFreeBalance = this.cfState.stateChannel(multisig)
						.freeBalance;
					let uniqueId = 3; // todo
					let localNonce = 1;
					let data = message.clientMessage.data;
					let newAppChannel: AppChannelInfo = {
						id: cfAddr,
						peerA: data.peerA,
						peerB: data.peerB,
						keyA: data.keyA,
						keyB: data.keyB,
						rootNonce: 1,
						encodedState: "0x0", // todo
						localNonce: 1
					};
					let peerA = new PeerBalance(
						existingFreeBalance.peerA.address,
						existingFreeBalance.peerA.balance - data.peerA.balance
					);
					let peerB = new PeerBalance(
						existingFreeBalance.peerB.address,
						existingFreeBalance.peerB.balance - data.peerB.balance
					);
					appChannelInfo = { [newAppChannel.id]: newAppChannel };
					freeBalance = new FreeBalance(
						peerA,
						peerB,
						existingFreeBalance.localNonce + 1,
						existingFreeBalance.uniqueId
					);
				} else if (message.actionName === "uninstall") {
					// todo
					// remove the app channe from the state
				}

				// todo: resolve this metho with initilizeExecution
				if (message.actionName !== "setup") {
					let updatedStateChannel = new StateChannelInfoImpl(
						message.clientMessage.toAddress,
						message.clientMessage.fromAddress,
						multisig,
						appChannelInfo,
						freeBalance
					);
					return { [multisig]: updatedStateChannel };
				}
			}
		);
		this.register(
			"validateSignatures",
			async (message: InternalMessage, next: Function, context: Context) => {
				let incomingMessage = getFirstResult("waitForIo", context.results);
				let op = getFirstResult("generateOp", context.results);
				// now validate the signature against the op hash
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
					let multisig = message.clientMessage.multisigAddress;
					return CfOpSetup.nonceUpdateOp(
						nonceUniqueId,
						multisig,
						this.cfState.stateChannel(multisig).owners(),
						this.cfState.networkContext
					);
				}
				if (
					message.actionName === "setup" &&
					message.opCodeArgs[0] === "setupFreeBalance"
				) {
					let freeBalanceUniqueId = 2; // todo
					let owners = [];
					return CfOpSetup.freeBalanceInstallOp(
						freeBalanceUniqueId,
						message.clientMessage.multisigAddress,
						message.clientMessage.stateChannel.owners(),
						this.cfState.networkContext
					);
				}
				if (message.actionName === "install") {
					let appKeys = [
						message.clientMessage.data.keyA,
						message.clientMessage.data.keyB
					];
					let multisig = message.clientMessage.multisigAddress;
					let channelKeys = this.cfState.stateChannel(multisig).owners();
					let uniqueId = 4; // todo
					let app = new CfApp( //todo
						"0x1",
						"",
						channelKeys,
						[
							message.clientMessage.data.peerA,
							message.clientMessage.data.peerB
						],
						null,
						"",
						uniqueId
					);
					let [op, cfAddr] = CfOpInstall.operation(
						this.cfState.networkContext,
						multisig,
						this.cfState.freeBalance(multisig),
						channelKeys,
						appKeys,
						app
					);
					return {
						op,
						cfAddr
					};
				}
				if (message.actionName == "uninstall") {
					debugger;
					let multisig = message.clientMessage.multisigAddress;
					let cfAddr = message.clientMessage.appId;
					let op = CfOpUninstall.operation(
						this.cfState.networkContext,
						multisig,
						this.cfState.freeBalance(multisig),
						this.cfState.app(multisig, cfAddr),
						message.clientMessage.data.peerAmounts
					);
				}
			}
		);
		/**
		 * After generating this machine's app/ephemeral key, mutate the
		 * client message by placing the ephemeral key on it for my address.
		 */
		this.register(
			"generateKey",
			async (message: InternalMessage, next: Function, context: Context) => {
				let wallet = ethers.Wallet.createRandom();
				let installData = message.clientMessage.data;
				if (installData.peerA.address == message.clientMessage.fromAddress) {
					installData.keyA = wallet.address;
				} else {
					installData.keyB = wallet.address;
				}
				return wallet;
			}
		);
	}

	validateMessage(msg: ClientMessage) {
		return true;
	}

	receive(msg: ClientMessage): Response {
		this.validateMessage(msg);
		let request = new Action(msg.requestId, msg.action, msg);
		this.requests[request.requestId] = request;
		this.processRequest(request);
		return new Response(request.requestId, ResponseStatus.STARTED);
	}

	sendResponse(res: Response) {
		this.wallet.sendResponse(res);
	}

	async processRequest(action: Action) {
		let val;
		console.log("Processing request: ", action);
		// TODO deal with errors
		for await (val of action.execute(this)) {
			//console.log("processed a step");
		}
		this.mutateState(val);
		//
		if (!action.isAckSide) {
			this.sendResponse(
				new Response(action.requestId, ResponseStatus.COMPLETED)
			);
		}
	}

	mutateState(state: ChannelStates) {
		Object.assign(this.cfState.channelStates, state);
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

	stateChannel(multisig: string): StateChannelInfo {
		return this.channelStates[multisig];
	}

	app(multisig: string, cfAddr: string): AppChannelInfo {
		return this.channelStates[multisig].appChannels[cfAddr];
	}

	freeBalance(multisig: string): FreeBalance {
		return this.channelStates[multisig].freeBalance;
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
	constructor(
		readonly requestId: string,
		readonly status: ResponseStatus,
		error?: string
	) {}
}

export enum ResponseStatus {
	STARTED,
	COMPLETED
}

export function getFirstResult(
	toFindOpCode: string,
	results: { value: any; opCode }[]
): OpCodeResult {
	return results.find(({ opCode, value }) => opCode === toFindOpCode);
}
