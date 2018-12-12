import { legacy } from "@counterfactual/cf.js";
import { ethers } from "ethers";

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
    [Opcode.STATE_TRANSITION_COMMIT]: [],
    [Opcode.STATE_TRANSITION_PROPOSE]: []
  };

  constructor(readonly node: Node) {}

  public add(scope: Opcode, method: InstructionMiddlewareCallback) {
    this.middlewares[scope].push({ scope, method });
  }

  public async run(msg: InternalMessage, context: Context) {
    let counter = 0;
    const middlewares = this.middlewares;
    const { opCode } = msg;

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
    message: legacy.node.ClientActionMessage,
    signature: ethers.utils.Signature
  ): legacy.node.ClientActionMessage {
    return {
      ...message,
      signature,
      seq: message.seq + 1
    };
  }
}
