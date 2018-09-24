import { AckInstructions, Instruction, Instructions } from "./instructions";
import {
  ActionName,
  ClientActionMessage,
  InternalMessage,
  MiddlewareResult
} from "./types";
import { CounterfactualVM } from "./vm";

if (!Symbol.asyncIterator) {
  (Symbol as any).asyncIterator = Symbol.for("Symbol.asyncIterator");
}

export class Action {
  public name: ActionName;
  public requestId: string;
  public clientMessage: ClientActionMessage;
  public execution: ActionExecution = Object.create(null);
  public instructions: Instruction[];
  public isAckSide: boolean;

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

  public makeExecution(vm: CounterfactualVM): ActionExecution {
    const exe = new ActionExecution(this, 0, this.clientMessage, vm);
    this.execution = exe;
    return exe;
  }
}

export class ActionExecution {
  public action: Action;
  public instructionPointer: number;
  public clientMessage: ClientActionMessage;
  public vm: CounterfactualVM;
  public results: MiddlewareResult[];

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

  public async next(): Promise<{ done: boolean; value: number }> {
    if (this.instructionPointer === this.action.instructions.length) {
      return { done: true, value: 0 };
    }

    const op = this.action.instructions[this.instructionPointer];
    const internalMessage = new InternalMessage(
      this.action.name,
      op,
      this.clientMessage
    );
    const context = {
      results: this.results,
      instructionPointer: this.instructionPointer,
      vm: this.vm
    };

    try {
      const value = await this.vm.middleware.run(internalMessage, context);
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

  public [Symbol.asyncIterator]() {
    return {
      next: () => this.next()
    };
  }
}
