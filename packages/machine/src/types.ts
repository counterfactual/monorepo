import * as cf from "@counterfactual/cf.js";

import { Context } from "./instruction-executor";
import { Opcode } from "./instructions";

/**
 * The return value from the STATE_TRANSITION_PROPOSE middleware.
 */
export interface StateProposal {
  channel: cf.legacy.channel.StateChannelInfo;
  cfAddr?: cf.legacy.utils.H256;
}

export type ProposerActionsHash = {
  [Name in cf.legacy.node.ActionName]?: ContextualizedStateProposer
};

export interface ContextualizedStateProposer {
  propose(
    message: InternalMessage,
    context: Context,
    channel: cf.legacy.channel.StateChannelInfo,
    network?: cf.legacy.network.NetworkContext
  ): StateProposal;
}

export interface OpCodeResult {
  opCode: Opcode;
  value: any;
}

export class InternalMessage {
  constructor(
    public actionName: cf.legacy.node.ActionName,
    public opCode: Opcode,
    public clientMessage: cf.legacy.node.ClientActionMessage,
    public isAckSide: boolean
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
