import { Action } from "./action";
import {
	ChannelStates,
	OpCodeResult,
	ResponseSink,
	StateChannelInfo,
	ClientMessage,
	PeerBalance,
	Address,
	H256,
	Addressable,
	InternalMessage,
	NetworkContext
} from "./types";
import { CfMiddleware, CfOpGenerator } from "./middleware/middleware";
import { CfState, Context } from "./state";
import { Instruction } from "./instructions";

export class CfVmConfig {
	constructor(
		readonly responseHandler: ResponseSink,
		readonly cfOpGenerator: CfOpGenerator,
		readonly state?: ChannelStates,
		readonly network?: NetworkContext
	) {}
}

export class CounterfactualVM {
	middleware: CfMiddleware;
	responseHandler: ResponseSink;
	cfState: CfState;

	constructor(config: CfVmConfig) {
		this.responseHandler = config.responseHandler;
		this.cfState = new CfState(
			config.state ? config.state : Object.create(null),
			config.network
		);
		this.middleware = new CfMiddleware(this.cfState, config.cfOpGenerator);
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
		this.middleware.add(scope, method);
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
