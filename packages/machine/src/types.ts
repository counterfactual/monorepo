import { legacy } from "@counterfactual/cf.js";

import { Context } from "./instruction-executor";
import { Node } from "./node";
import { Opcode } from "./opcodes";

export enum Protocol {
  Setup = "setup",
  Install = "install",
  SetState = "set-state",
  Uninstall = "uninstall",
  MetaChannelInstallApp = "metachannel-install-app"
}

/**
 * The return value from the STATE_TRANSITION_PROPOSE middleware.
 */
export interface StateProposal {
  state: legacy.channel.StateChannelInfos;
  cfAddr?: legacy.utils.H256;
}

export type ProposerActionsHash = {
  [Name in legacy.node.ActionName]?: ContextualizedStateProposer
};

export interface ContextualizedStateProposer {
  propose(
    message: InternalMessage,
    context: Context,
    node: Node
  ): StateProposal;
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

export type NetworkContext = {
  ETHBucket: string;
  StateChannelTransaction: string;
  MultiSend: string;
  NonceRegistry: string;
  AppRegistry: string;
  ETHBalanceRefund: string;
};
