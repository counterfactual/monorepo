import { Opcode } from "./opcodes";
import {
  Context,
  InstructionMiddlewareCallback,
  InstructionMiddlewares,
  InternalMessage
} from "./types";

/**
 * Middleware is the container holding the groups of middleware responsible
 * for executing a given instruction in the Counterfactual InstructionExecutor.
 */
export class Middleware {
  /**
   * Maps instruction to list of middleware that will process the instruction.
   */
  public readonly middlewares: InstructionMiddlewares = {
    [Opcode.IO_SEND]: [],
    [Opcode.IO_WAIT]: [],
    [Opcode.OP_SIGN]: [],
    [Opcode.OP_SIGN_VALIDATE]: [],
    [Opcode.STATE_TRANSITION_COMMIT]: [],
    [Opcode.STATE_TRANSITION_PROPOSE]: []
  };

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

    const middleware = this.middlewares[opCode][0];

    if (middleware === undefined) {
      throw Error(
        `Attempted to run middleware for opcode ${opCode} but none existed`
      );
    }

    return middleware.method(msg, callback, context);
  }
}
