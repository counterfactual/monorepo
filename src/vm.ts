import { Action } from "./action";
import {
	ChannelStates,
	OpCodeResult,
	ResponseSink,
	StateChannelInfo,
	ClientMessage,
	FreeBalance,
	PeerBalance,
	Address,
	H256
} from "./types";
import {
	NextMsgGenerator,
	KeyGenerator,
	SignatureValidator,
	StateDiffGenerator,
	CfOpGenerator
} from "./middleware/middleware";
import { CfState, Context } from "./state";
import { Instruction } from "./instructions";

export class CounterfactualVM {
	middlewares: { method: Function; scope: Instruction }[];
	responseHandler: ResponseSink;
	cfState: CfState;

	constructor(responseHandler: ResponseSink) {
		this.middlewares = [];
		this.responseHandler = responseHandler;
		this.cfState = new CfState(Object.create(null));
	}

	startAck(message: ClientMessage) {
		this.execute(new Action(message.requestId, message.action, message, true));
	}

	// TODO add support for not appID
	getStateChannelFromAddressable(data: Addressable): StateChannelInfo {
		if (data.appId) {
			return this.cfState.appChannelInfos[data.appId].stateChannel;
		} else {
			throw Error("No app id available");
		}
	}

	initState(state: ChannelStates) {
		// @igor what do you think about putting this logic in the constructor?
		// TODO make this more robust/go through a nice method
		Object.assign(this.cfState.channelStates, state);
	}

	setupDefaultMiddlewares() {
		this.register(
			Instruction.SUCCESS,
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
			Instruction.OP_GENERATE,
			async (message: InternalMessage, next: Function) => {
				return CfOpGenerator.generate(message, next, this.cfState);
			}
		);
		this.register(Instruction.KEY_GENERATE, KeyGenerator.generate);
		this.register(Instruction.OP_SIGN_VALIDATE, SignatureValidator.validate);
		this.register(Instruction.IO_PREPARE_SEND, NextMsgGenerator.generate);
	}

	receive(msg: ClientMessage): Response {
		this.validateMessage(msg);
		let action = new Action(msg.requestId, msg.action, msg);
		this.execute(action);
		return new Response(action.requestId, ResponseStatus.STARTED);
	}

	validateMessage(msg: ClientMessage) {
		// todo
		return true;
	}

	sendResponse(res: Response) {
		this.responseHandler.sendResponse(res);
	}

	async execute(action: Action) {
		let val;
		console.log("Processing request: ", action);
		// TODO deal with errors
		for await (val of action.execute(this)) {
			//console.log("processed a step");
		}
		this.mutateState(val);
		if (!action.isAckSide) {
			this.sendResponse(
				new Response(action.requestId, ResponseStatus.COMPLETED)
			);
		}
	}

	mutateState(state: ChannelStates) {
		Object.assign(this.cfState.channelStates, state);
	}

	register(scope: Instruction, method: Function) {
		this.middlewares.push({ scope, method });
	}
}

export interface Addressable {
	appId?: H256;
	multisigAddress?: Address;
	toAddress?: Address;
	fromAddress?: Address;
}

export class InternalMessage {
	actionName: string;
	opCode: Instruction;
	clientMessage: ClientMessage;

	constructor(
		action: string,
		opCode: Instruction,
		clientMessage: ClientMessage
	) {
		this.actionName = action;
		this.opCode = opCode;
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
	toFindOpCode: Instruction,
	results: { value: any; opCode }[]
): OpCodeResult {
	// FIXME: (ts-strict) we should change the results data structure or design
	// @ts-ignore
	return results.find(({ opCode, value }) => opCode === toFindOpCode);
}

export function getLastResult(
	toFindOpCode: Instruction,
	results: {
		value: any;
		opCode;
	}[]
) {
	for (let k = results.length - 1; k >= 0; k -= 1) {
		if (results[k].opCode === toFindOpCode) {
			return results[k];
		}
	}
	return null;
}
