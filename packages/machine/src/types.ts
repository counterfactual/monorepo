import { legacy } from "@counterfactual/cf.js";

import { Context } from "./instruction-executor";

import { Opcode } from "./opcodes";

export enum Protocol {
  Setup = "setup",
  Install = "install",
  SetState = "set-state",
  Uninstall = "uninstall",
  MetaChannelInstallApp = "metachannel-install-app"
}

export class InternalMessage {
  constructor(
    public actionName: legacy.node.ActionName,
    public opCode: Opcode,
    public clientMessage: legacy.node.ClientActionMessage
  ) {}
}

export type InstructionMiddlewareCallback = {
  (message: InternalMessage, next: Function, context: Context);
};

export interface InstructionMiddleware {
  scope: Opcode;
  method: InstructionMiddlewareCallback;
}

export type InstructionMiddlewares = { [I in Opcode]: InstructionMiddleware[] };

