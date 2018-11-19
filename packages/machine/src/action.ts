import * as cf from "@counterfactual/cf.js";

import {
  Context,
  InstructionExecutor,
  IntermediateResults
} from "./instruction-executor";
import { ackInstructions, instructions, Opcode } from "./instructions";
import { InternalMessage } from "./types";

export function instructionGroupFromProtocolName(
  protocolName: cf.legacy.node.ActionName,
  isAckSide: boolean
): Opcode[] {
  if (isAckSide) {
    return ackInstructions[protocolName];
  }
  return instructions[protocolName];
}

export class ActionExecution {
  public actionName: cf.legacy.node.ActionName;
  public instructions: Opcode[];
  public instructionPointer: number;
  public clientMessage: cf.legacy.node.ClientActionMessage;
  public instructionExecutor: InstructionExecutor;
  public isAckSide: boolean;
  public intermediateResults: IntermediateResults;
  public requestId: string;

  constructor(
    actionName: cf.legacy.node.ActionName,
    instructions: Opcode[],
    instructionPointer: number,
    clientMessage: cf.legacy.node.ClientActionMessage,
    instructionExecutor: InstructionExecutor,
    isAckSide: boolean,
    requestId: string,
    intermediateResults: IntermediateResults
  ) {
    this.actionName = actionName;
    this.instructions = instructions;
    this.instructionPointer = instructionPointer;
    this.clientMessage = clientMessage;
    this.instructionExecutor = instructionExecutor;
    this.isAckSide = isAckSide;
    this.requestId = requestId;
    this.intermediateResults = intermediateResults;
  }

  public createInternalMessage(): InternalMessage {
    const op = this.instructions[this.instructionPointer];
    return new InternalMessage(
      this.actionName,
      op,
      this.clientMessage,
      this.isAckSide
    );
  }

  public createContext(): Context {
    return {
      intermediateResults: this.intermediateResults,
      instructionPointer: this.instructionPointer,
      // TODO: Should probably not pass the whole InstructionExecutor in, it breaks the encapsulation
      // We should figure out what others args from the InstructionExecutor are used and copy those over
      // https://github.com/counterfactual/monorepo/issues/136
      instructionExecutor: this.instructionExecutor
    };
  }

  public async runAll(): Promise<void> {
    while (this.instructionPointer < this.instructions.length) {
      const internalMessage = this.createInternalMessage();
      const context = this.createContext();

      try {
        await this.instructionExecutor.middleware.run(internalMessage, context);

        this.instructionPointer += 1;

        // push modified value of `context.intermediateResults`
        this.intermediateResults = context.intermediateResults;
      } catch (e) {
        throw Error(
          `While executing op ${Opcode[internalMessage.opCode]} at seq ${
            this.clientMessage.seq
          }, execution failed with the following error. ${e.stack}`
        );
      }
    }
  }
}
