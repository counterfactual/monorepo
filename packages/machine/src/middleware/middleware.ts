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
    let counter = 0;
    const middlewares = this.middlewares;
    const opCode = msg.opCode;

    async function callback() {
      if (counter === middlewares[opCode].length - 1) {
        return null;
      }
      // This is hacky, prevents next from being called more than once
      counter += 1;
      const middleware = middlewares[opCode][counter];
      if (middleware.scope === opCode) {
        return middleware.method(msg, callback, context);
      }
      return callback();
    }
    return this.middlewares[opCode][0].method(msg, callback, context);
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
