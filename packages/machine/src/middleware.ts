import { Opcode } from "./enums";
import { Middleware } from "./types";

export class MiddlewareContainer {
  public readonly middlewares: { [I in Opcode]: Middleware[] } = {
    [Opcode.IO_SEND]: [],
    [Opcode.IO_SEND_AND_WAIT]: [],
    [Opcode.OP_SIGN]: [],
    [Opcode.OP_SIGN_AS_INTERMEDIARY]: [],
    [Opcode.WRITE_COMMITMENT]: []
  };

  public add(scope: Opcode, method: Middleware) {
    this.middlewares[scope].push(method);
  }

  public async run(opCode: Opcode, args: any[]) {
    const middleware = this.middlewares[opCode][0];

    if (middleware === undefined) {
      throw Error(
        `Attempted to run middleware for opcode ${opCode} but none existed`
      );
    }

    return middleware(args);
  }
}
