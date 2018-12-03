import * as cf from "@counterfactual/cf.js";
import { ClientActionMessage } from "@counterfactual/cf.js/src/legacy/node";
import { Signature } from "ethers/utils";

import { Context } from "../instruction-executor";
import { Node } from "../node";
import { Opcode } from "../opcodes";
import {
  InstructionMiddlewareCallback,
  InstructionMiddlewares,
  InternalMessage
} from "../types";

/**
 * Middleware is the container holding the groups of middleware responsible
 * for executing a given instruction in the Counterfactual InstructionExecutor.
 */
export class Middleware {
  /**
   * Maps instruction to list of middleware that will process the instruction.
   */
  public middlewares: InstructionMiddlewares = {
    [Opcode.IO_SEND]: [],
    [Opcode.IO_WAIT]: [],
    [Opcode.OP_SIGN]: [],
    [Opcode.OP_SIGN_VALIDATE]: [],
    [Opcode.STATE_TRANSITION_COMMIT]: [
      {
        scope: Opcode.STATE_TRANSITION_COMMIT,
        method: (message, next, context) => {
          const newState = context.intermediateResults.proposedStateTransition!;
          context.instructionExecutor.mutateState(newState.state);
          next();
        }
      }
    ],
    [Opcode.STATE_TRANSITION_PROPOSE]: []
  };

  constructor(readonly node: Node) {}

  public add(scope: Opcode, method: InstructionMiddlewareCallback) {
    this.middlewares[scope].push({ scope, method });
  }

  public async run(msg: InternalMessage, context: Context) {
    const middlewares = this.middlewares;
    const opCode = msg.opCode;

    for (const middleware of middlewares[opCode]) {
      await middleware.method(msg, () => {}, context);
    }
  }
}

export class NextMsgGenerator {
  public static generate2(
    message: cf.legacy.node.ClientActionMessage,
    signature: Signature
  ): ClientActionMessage {
    return {
      signature,
      appInstanceId: message.appInstanceId,
      action: message.action,
      data: message.data,
      multisigAddress: message.multisigAddress,
      toAddress: message.toAddress,
      fromAddress: message.fromAddress,
      seq: message.seq + 1
    };
  }
}
