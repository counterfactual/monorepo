import { legacy } from "@counterfactual/cf.js";

import { Context, InstructionExecutor } from "./instruction-executor";
import { AppInstance } from "./models/app-instance";
import { StateChannel } from "./models/state-channel";
import { Opcode } from "./opcodes";
import { InternalMessage } from "./types";

export class ActionExecution {
  constructor(
    public readonly actionName: legacy.node.ActionName,
    public readonly instructions: (Opcode | Function)[],
    public readonly clientMessage: legacy.node.ClientActionMessage,
    public readonly instructionExecutor: InstructionExecutor
  ) {}

  // TODO: Should it return these?
  public async runAll(): Promise<StateChannel | AppInstance> {
    let instructionPointer = 0;

    const context = {
      outbox: [],
      inbox: []
    } as Context;

    while (instructionPointer < this.instructions.length) {
      try {
        const instruction = this.instructions[instructionPointer];

        if (typeof instruction === "function") {
          const message = new InternalMessage(
            this.actionName,
            Object.create(null),
            this.clientMessage
          );

          const state = this.instructionExecutor.node;

          instruction.call(null, message, context, state);
          instructionPointer += 1;
        } else {
          const message = new InternalMessage(
            this.actionName,
            instruction,
            this.clientMessage
          );

          await this.instructionExecutor.middleware.run(message, context);
          instructionPointer += 1;
        }
      } catch (e) {
        // TODO: We should have custom error types for things like this
        throw Error(
          `While executing op number ${instructionPointer} at seq ${
            this.clientMessage.seq
          } of protocol ${
            this.actionName
          }, execution failed with the following error. ${e.stack}`
        );
      }
    }

    return context.proposedStateTransition;
  }
}
