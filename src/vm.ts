import { Action, ActionExecution } from "./action";
import {
	ChannelStates,
	ResponseSink,
	StateChannelInfo,
	NetworkContext,
	ClientActionMessage,
	Addressable,
	WalletResponse
} from "./types";
import { CfVmWal } from "./wal";
import { CfMiddleware, CfOpGenerator } from "./middleware/middleware";
import { CfState } from "./state";
import { Instruction } from "./instructions";
import { applyMixins } from "./mixins/apply";
import { Observable, NotificationType } from "./mixins/observable";

export class CfVmConfig {
	constructor(
		readonly responseHandler: ResponseSink,
		readonly cfOpGenerator: CfOpGenerator,
		readonly wal: CfVmWal,
		readonly network: NetworkContext,
		readonly state?: ChannelStates
	) {}
}

export class CounterfactualVM implements Observable {
	/**
	 * The object responsible for processing each Instruction in the Vm.
	 */
	middleware: CfMiddleware;
	/**
	 * The delegate handler we send responses to.
	 */
	responseHandler: ResponseSink;
	/**
	 * The underlying state for the entire machine. All state here is a result of
	 * a completed and commited protocol.
	 */
	cfState: CfState;
	/**
	 * The write ahead log is used to keep track of protocol executions.
	 * Specifically, whenever an instruction in a protocol is executed,
	 * we write to the log so that, if the machine crashes, we can resume
	 * by reading the last log entry and starting where the protocol left off.
	 */
	writeAheadLog: CfVmWal;

	// Obserable
	observers: Map<NotificationType, Function[]> = new Map();
	registerObserver(type: NotificationType, callback: Function) {}
	unregisterObserver(type: NotificationType, callback: Function) {}
	notifyObservers(type: NotificationType, data: object) {}

	constructor(config: CfVmConfig) {
		this.responseHandler = config.responseHandler;
		this.cfState = new CfState(
			config.state ? config.state : Object.create(null),
			config.network
		);
		this.middleware = new CfMiddleware(this.cfState, config.cfOpGenerator);
		this.writeAheadLog = config.wal;
	}
	/**
	 * Restarts all protocols that were stopped mid execution, and returns when
	 * they all finish.
	 */
	async resume() {
		let executions = this.writeAheadLog.read(this);
		return executions.reduce(
			(promise, exec) => promise.then(_ => this.run(exec)),
			Promise.resolve()
		);
	}

	startAck(message: ClientActionMessage) {
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

	receive(msg: ClientActionMessage): WalletResponse {
		this.validateMessage(msg);
		let action = new Action(msg.requestId, msg.action, msg);
		this.execute(action);
		return new WalletResponse(action.requestId, ResponseStatus.STARTED);
	}

	validateMessage(msg: ClientActionMessage) {
		// TODO;
		return true;
	}

	async execute(action: Action) {
		let execution = action.makeExecution(this);
		this.writeAheadLog.write(execution);
		await this.run(execution);

		this.notifyObservers("actionCompleted", {
			type: "notification",
			NotificationType: "actionCompleted",
			data: {
				requestId: action.requestId,
				name: action.name,
				results: execution.results,
				clientMessage: action.clientMessage
			}
		});
	}

	async run(execution: ActionExecution) {
		try {
			// temporary error handling for testing resuming protocols
			let val;
			for await (val of execution) {
				this.writeAheadLog.write(execution);
			}
			this.sendResponse(execution, ResponseStatus.COMPLETED);
			this.writeAheadLog.clear(execution);
		} catch (e) {
			console.error(e);
			this.sendResponse(execution, ResponseStatus.ERROR);
		}
	}

	sendResponse(execution: ActionExecution, status: ResponseStatus) {
		if (!execution.action.isAckSide) {
			this.responseHandler.sendResponse(
				new Response(execution.action.requestId, status)
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
	ERROR,
	COMPLETED
}

applyMixins(CounterfactualVM, [Observable]);
