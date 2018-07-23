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
import { KeyGenerator, OpCodeGenerator, StateDiffGenerator } from "./generator";

import {
	CfState,
	AppChannelInfoImpl,
	StateChannelInfoImpl,
	Context
} from "./state";
import { stat } from "fs";
import { Instructions, AckInstructions } from "instructions";

export class CounterfactualVM {
	middlewares: { method: Function; scope: string }[];
	wallet: ResponseSink;
	cfState: CfState;

	constructor(wallet: ResponseSink) {
		this.middlewares = [];
		this.wallet = wallet;
		this.cfState = new CfState(Object.create(null));
	}

	startAck(message: ClientMessage) {
		let request = new Action(message.requestId, message.action, message, true);
		this.processRequest(request);
	}

	// TODO add support for not appID
	getStateChannelFromAddressable(data: Addressable): StateChannelInfo {
		if (data.appId) {
			return this.cfState.appChannelInfos[data.appId].stateChannel;
		}
	}

	initState(state: ChannelStates) {
		// @igor what do you think about putting this logic in the constructor?
		// TODO make this more robust/go through a nice method
		Object.assign(this.cfState.channelStates, state);
	}

	setupDefaultMiddlewares() {
		this.register(
			"returnSuccess",
			async (message: InternalMessage, next: Function, context: Context) => {
				return StateDiffGenerator.generate(
					message,
					next,
					context,
					this.cfState
				);
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
				return OpCodeGenerator.generate(message, next, this.cfState);
			}
		);
		this.register("generateKey", KeyGenerator.generate);
	}

	receive(msg: ClientMessage): Response {
		this.validateMessage(msg);
		let request = new Action(msg.requestId, msg.action, msg);
		this.processRequest(request);
		return new Response(request.requestId, ResponseStatus.STARTED);
	}

	validateMessage(msg: ClientMessage) {
		// todo
		return true;
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

interface Addressable {
	appId?: string;
	multisigAddress?: string;
	toAddress?: string;
	fromAddress?: string;
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
