import {
	StateChannelInfos,
	AppChannelInfos,
	ChannelStates,
	OpCodeResult,
	ResponseSink,
	AppChannelInfo,
	StateChannelInfo,
	ClientMessage,
	FreeBalance,
	PeerBalance
} from "./types";
import { AppChannelInfoImpl, StateChannelInfoImpl } from "./state";
import { CounterfactualVM, InternalMessage } from "./vm";
import { Instructions, AckInstructions, Instruction } from "./instructions";

if (!Symbol.asyncIterator) {
	(Symbol as any).asyncIterator = Symbol.for("Symbol.asyncIterator");
}

export class Action {
	name: string;
	requestId: string;
	clientMessage: ClientMessage;
	execution: ActionExecution;
	instructions: Instruction[];
	isAckSide: boolean;

	constructor(
		id: string,
		action: string,
		clientMessage: ClientMessage,
		isAckSide: boolean = false
	) {
		this.requestId = id;
		this.clientMessage = clientMessage;
		this.name = action;
		this.isAckSide = isAckSide;

		if (isAckSide) {
			this.instructions = AckInstructions[action];
		} else {
			this.instructions = Instructions[action];
		}
	}

	execute(vm: CounterfactualVM): ActionExecution {
		let exe = new ActionExecution(this, 0, this.clientMessage, vm);
		this.execution = exe;
		return exe;
	}
}

export class ActionExecution {
	action: Action;
	instructionPointer: number;
	clientMessage: ClientMessage;
	vm: CounterfactualVM;
	// probably not the best data structure
	results: { opCode: Instruction; value: any }[];
	stateChannelInfos: StateChannelInfos;
	appChannelInfos: AppChannelInfos;

	constructor(
		action: Action,
		instruction: number,
		clientMessage: ClientMessage,
		vm: CounterfactualVM
	) {
		this.action = action;
		this.instructionPointer = instruction;
		this.clientMessage = clientMessage;
		this.vm = vm;
		this.results = [];
		this.stateChannelInfos = vm.cfState.stateChannelInfos();
		this.appChannelInfos = vm.cfState.appChannelInfos();
	}

	initializeExecution() {
		if (this.action.name === "setup") {
			let toAddress = this.clientMessage.toAddress;
			let fromAddress = this.clientMessage.fromAddress;
			let balances = PeerBalance.balances(toAddress, 0, fromAddress, 0);
			let uniqueId = 2; // todo
			let localNonce = 1;
			let timeout = 100; // todo, probably some default timeout
			let freeBalance = new FreeBalance(
				balances.peerA,
				balances.peerB,
				localNonce,
				uniqueId,
				timeout
			);
			let stateChannel = new StateChannelInfoImpl(
				toAddress,
				fromAddress,
				this.clientMessage.multisigAddress,
				{},
				freeBalance
			);
			this.clientMessage.stateChannel = stateChannel;
			// TODO Think about pending state/whether we want to do this for the
			// underlying copy
			this.vm.mutateState({
				[this.clientMessage.multisigAddress]: stateChannel
			});
		}
	}

	async next(): Promise<{ done: boolean; value: number }> {
		if (this.instructionPointer === this.action.instructions.length) {
			return { done: true, value: 0 };
		}
		if (this.instructionPointer === 0) {
			this.initializeExecution();
		}
		let op = this.action.instructions[this.instructionPointer];
		console.log("Executing op: ", op, this.clientMessage.seq);
		let internalMessage = new InternalMessage(
			this.action.name,
			op,
			this.clientMessage
		);

		let value = await this.runMiddlewares(internalMessage);
		this.instructionPointer++;
		this.results.push({ opCode: op, value });
		return { value, done: false };
	}

	async runMiddlewares(msg: InternalMessage) {
		let resolve;
		let result = new Promise((res, rej) => {
			resolve = res;
		});

		let counter = 0;
		let middlewares = this.vm.middlewares;
		let opCode = msg.opCode;
		let context = {
			results: this.results,
			stateChannelInfos: this.stateChannelInfos,
			appChannelInfos: this.appChannelInfos,
			instructionPointer: this.instructionPointer
		};
		async function callback() {
			if (counter === middlewares.length - 1) {
				return Promise.resolve(null);
			} else {
				// This is hacky, prevents next from being called more than once
				counter++;
				let middleware = middlewares[counter];
				if (
					middleware.scope === Instruction.ALL ||
					middleware.scope === opCode
				) {
					return middleware.method(msg, callback, context);
				} else {
					return callback();
				}
			}
		}
		return middlewares[counter].method(msg, callback, context);
	}

	[Symbol.asyncIterator]() {
		return {
			next: () => this.next()
		};
	}
}
