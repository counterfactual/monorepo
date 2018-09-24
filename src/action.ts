import { CounterfactualVM } from "./vm";
import { Instructions, AckInstructions, Instruction } from "./instructions";
import {
	ActionName,
	ClientActionMessage,
	MiddlewareResult,
	InternalMessage
} from "./types";

if (!Symbol.asyncIterator) {
	(Symbol as any).asyncIterator = Symbol.for("Symbol.asyncIterator");
}

export class Action {
	name: ActionName;
	requestId: string;
	clientMessage: ClientActionMessage;
	execution: ActionExecution = Object.create(null);
	instructions: Instruction[];
	isAckSide: boolean;

	constructor(
		id: string,
		action: ActionName,
		clientMessage: ClientActionMessage,
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

	makeExecution(vm: CounterfactualVM): ActionExecution {
		let exe = new ActionExecution(this, 0, this.clientMessage, vm);
		this.execution = exe;
		return exe;
	}
}

export class ActionExecution {
	action: Action;
	instructionPointer: number;
	clientMessage: ClientActionMessage;
	vm: CounterfactualVM;
	results: MiddlewareResult[];

	constructor(
		action: Action,
		instruction: number,
		clientMessage: ClientActionMessage,
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

		try {
			let value = await this.vm.middleware.run(internalMessage, context);
			this.instructionPointer++;
			this.results.push({ opCode: op, value });

			return { value, done: false };
		} catch (e) {
			throw Error(
				`While executing op ${Instruction[op]} at seq ${
					this.clientMessage.seq
				}, execution failed with the following error. ${e.stack}`
			);
		}
	}

	[Symbol.asyncIterator]() {
		return {
			next: () => this.next()
		};
	}
}
