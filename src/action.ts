import {
	StateChannelInfos,
	AppChannelInfos,
	ClientMessage,
	PeerBalance,
	InternalMessage
} from "./types";
import { StateChannelInfoImpl } from "./state";
import { CounterfactualVM } from "./vm";
import { Instructions, AckInstructions, Instruction } from "./instructions";

if (!Symbol.asyncIterator) {
	(Symbol as any).asyncIterator = Symbol.for("Symbol.asyncIterator");
}

export class Action {
	name: string;
	requestId: string;
	clientMessage: ClientMessage;
	execution: ActionExecution = Object.create(null);
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
	}

	async next(): Promise<{ done: boolean; value: number }> {
		if (this.instructionPointer === this.action.instructions.length) {
			return { done: true, value: 0 };
		}

		let op = this.action.instructions[this.instructionPointer];
		console.log("Executing op: ", op, this.clientMessage.seq);
		let internalMessage = new InternalMessage(
			this.action.name,
			op,
			this.clientMessage
		);
		let context = {
			results: this.results,
			instructionPointer: this.instructionPointer,
			vm: this.vm
		};
		let value = await this.vm.middleware.run(internalMessage, context);
		this.instructionPointer++;
		this.results.push({ opCode: op, value });
		return { value, done: false };
	}

	[Symbol.asyncIterator]() {
		return {
			next: () => this.next()
		};
	}
}
