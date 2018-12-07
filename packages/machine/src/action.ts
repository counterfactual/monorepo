import { legacy } from "@counterfactual/cf.js";

import { Context, InstructionExecutor } from "./instruction-executor";
import { Opcode } from "./opcodes";
import { InternalMessage, StateProposal } from "./types";

export class ActionExecution {
  public actionName: legacy.node.ActionName;
  public instructions: (Opcode | Function)[];
  public clientMessage: legacy.node.ClientActionMessage;
  public instructionExecutor: InstructionExecutor;

  constructor(
    actionName: legacy.node.ActionName,
    instructions: (Opcode | Function)[],
    clientMessage: legacy.node.ClientActionMessage,
    instructionExecutor: InstructionExecutor
  ) {
    this.actionName = actionName;
    this.instructions = instructions;
    this.clientMessage = clientMessage;
    this.instructionExecutor = instructionExecutor;
  }

  public createContext(): Context {
    return {
      intermediateResults: {
        outbox: [],
        inbox: []
      },
      // https://github.com/counterfactual/monorepo/issues/136
      instructionExecutor: this.instructionExecutor
    };
  }

  public async runAll(): Promise<StateProposal> {
    let instructionPointer = 0;
    const context = this.createContext();

    while (instructionPointer < this.instructions.length) {
      try {
        const instruction = this.instructions[instructionPointer];

        if (typeof instruction === "function") {
          instruction(
            new InternalMessage(
              this.actionName,
              Object.create(null),
              this.clientMessage
            ),
            context,
            this.instructionExecutor.node
          );
          instructionPointer += 1;
          continue;
        }

        const internalMessage = new InternalMessage(
          this.actionName,
          instruction,
          this.clientMessage
        );

        await this.instructionExecutor.middleware.run(internalMessage, context);
        instructionPointer += 1;
      } catch (e) {
        throw Error(
          `While executing op number ${instructionPointer} at seq ${
            this.clientMessage.seq
          } of protocol ${
            this.actionName
          }, execution failed with the following error. ${e.stack}`
        );
      }
    }
    return context.intermediateResults.proposedStateTransition!;
  }
}
