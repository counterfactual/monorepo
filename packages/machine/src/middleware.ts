import { Opcode } from "./enums";
import { Context, Middleware, ProtocolMessage } from "./types";

export class MiddlewareContainer {
  public readonly middlewares: { [I in Opcode]: Middleware[] } = {
    [Opcode.IO_SEND]: [],
    [Opcode.IO_SEND_AND_WAIT]: [],
    [Opcode.OP_SIGN]: [],
    [Opcode.OP_SIGN_AS_INTERMEDIARY]: [],
    [Opcode.STATE_TRANSITION_COMMIT]: []
  };

  public add(scope: Opcode, method: Middleware) {
    this.middlewares[scope].push(method);
  }

  public async run(msg: ProtocolMessage, opCode: Opcode, context: Context) {
    let counter = 0;
    const middlewares = this.middlewares;

    async function callback(): Promise<void> {
      if (counter === middlewares[opCode].length - 1) {
        return;
      }

      // This is hacky, prevents next from being called more than once
      counter += 1;

      const middleware = middlewares[opCode][counter];

      return middleware(msg, callback, context);
    }

    const middleware = this.middlewares[opCode][0];

    if (middleware === undefined) {
      throw Error(
        `Attempted to run middleware for opcode ${opCode} but none existed`
      );
    }

    return middleware(msg, callback, context);
  }
}
