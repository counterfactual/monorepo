import { Opcode } from "./opcodes";
import { ProtocolMessage } from "./protocol-types-tbd";
import {
  Context,
  InstructionMiddlewareCallback,
  InstructionMiddlewares
} from "./types";

export class Middleware {
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

  public async run(msg: ProtocolMessage, opCode: Opcode, context: Context) {
    let counter = 0;
    const middlewares = this.middlewares;

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
