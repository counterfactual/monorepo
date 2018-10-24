import { ackInstructions, Instruction, instructions } from "./instructions";
import { Context } from "./state";
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
      this.instructions = ackInstructions[action];
    } else {
      this.instructions = instructions[action];
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
    vm: CounterfactualVM,
    results: MiddlewareResult[] = []
  ) {
    this.action = action;
    this.instructionPointer = instruction;
    this.clientMessage = clientMessage;
    this.vm = vm;
    this.results = results;
  }

  // Public only for test purposes
  public createInternalMessage(): InternalMessage {
    const op = this.action.instructions[this.instructionPointer];
    return new InternalMessage(
      this.action.name,
      op,
      this.clientMessage,
      this.action.isAckSide
    );
  }

  public createContext(): Context {
    return {
      results: this.results,
      instructionPointer: this.instructionPointer,
      // TODO: Should probably not pass the whole VM in, it breaks the encapsulation
      // We should figure out what others args from the VM are used and copy those over
      vm: this.vm
    };
  }

  public async next(): Promise<{ done: boolean; value: number }> {
    if (this.instructionPointer === this.action.instructions.length) {
      return { done: true, value: 0 };
    }

    const internalMessage = this.createInternalMessage();
    const context = this.createContext();

    try {
      const value = await this.vm.middleware.run(internalMessage, context);
      this.instructionPointer += 1;
      this.results.push({ value, opCode: internalMessage.opCode });

      return { value, done: false };
    } catch (e) {
      throw Error(
        `While executing op ${Instruction[internalMessage.opCode]} at seq ${
          this.clientMessage.seq
        }, execution failed with the following error. ${e.stack}`
      );
    }
  }

  // TODO: Figure out the correct structure to be compliant with linter
  // tslint:disable
  public [Symbol.asyncIterator]() {
    return {
      next: () => this.next()
    };
  }
}
