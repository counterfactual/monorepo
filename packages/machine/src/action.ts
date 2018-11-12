import * as cf from "@counterfactual/cf.js";

import { Context, InstructionExecutor } from "./instruction-executor";
import { ackInstructions, instructions, Opcode } from "./instructions";
import { InternalMessage, OpCodeResult } from "./types";

if (!Symbol.asyncIterator) {
  (Symbol as any).asyncIterator = Symbol.for("Symbol.asyncIterator");
}

export class Action {
  public name: cf.legacy.node.ActionName;
  public requestId: string;
  public clientMessage: cf.legacy.node.ClientActionMessage;
  public execution: ActionExecution = Object.create(null);
  public instructions: Opcode[];
  public isAckSide: boolean;

  constructor(
    id: string,
    action: cf.legacy.node.ActionName,
    clientMessage: cf.legacy.node.ClientActionMessage,
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

  public makeExecution(
    instructionExecutor: InstructionExecutor
  ): ActionExecution {
    const exe = new ActionExecution(
      this,
      0,
      this.clientMessage,
      instructionExecutor
    );
    this.execution = exe;
    return exe;
  }
}

export class ActionExecution {
  public action: Action;
  public instructionPointer: number;
  public clientMessage: cf.legacy.node.ClientActionMessage;
  public instructionExecutor: InstructionExecutor;
  public results: OpCodeResult[];

  constructor(
    action: Action,
    instruction: Opcode,
    clientMessage: cf.legacy.node.ClientActionMessage,
    instructionExecutor: InstructionExecutor,
    results: OpCodeResult[] = []
  ) {
    this.action = action;
    this.instructionPointer = instruction;
    this.clientMessage = clientMessage;
    this.instructionExecutor = instructionExecutor;
    this.results = results;
  }

  private createInternalMessage(): InternalMessage {
    const op = this.action.instructions[this.instructionPointer];
    return new InternalMessage(
      this.action.name,
      op,
      this.clientMessage,
      this.action.isAckSide
    );
  }

  private createContext(): Context {
    return {
      results: this.results,
      instructionPointer: this.instructionPointer,
      // TODO: Should probably not pass the whole InstructionExecutor in, it breaks the encapsulation
      // We should figure out what others args from the InstructionExecutor are used and copy those over
      // https://github.com/counterfactual/monorepo/issues/136
      instructionExecutor: this.instructionExecutor
    };
  }

  private async next(): Promise<{ done: boolean; value: number }> {
    if (this.instructionPointer === this.action.instructions.length) {
      return { done: true, value: 0 };
    }

    const internalMessage = this.createInternalMessage();
    const context = this.createContext();

    try {
      const value = await this.instructionExecutor.middleware.run(
        internalMessage,
        context
      );
      this.instructionPointer += 1;
      this.results.push({ value, opCode: internalMessage.opCode });

      return { value, done: false };
    } catch (e) {
      throw Error(
        `While executing op ${Opcode[internalMessage.opCode]} at seq ${
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
