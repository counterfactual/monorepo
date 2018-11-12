import * as cf from "@counterfactual/cf.js";

import { Context } from "./instruction-executor";
import { Opcode } from "./instructions";
import { NodeState } from "./node-state";

export interface MiddlewareResult {
  opCode: Opcode;
  value: any;
}

/**
 * The return value from the STATE_TRANSITION_PROPOSE middleware.
 */
export interface StateProposal {
  state: cf.channel.StateChannelInfos;
  cfAddr?: cf.utils.H256;
}

export type ProposerActionsHash = {
  [Name in cf.node.ActionName]?: ContextualizedStateProposer
};

export interface ContextualizedStateProposer {
  propose(
    message: InternalMessage,
    context: Context,
    nodeState: NodeState
  ): StateProposal;
}

export interface OpCodeResult {
  opCode: Opcode;
  value: any;
}

export interface Addressable {
  appId?: cf.utils.H256;
  multisigAddress?: cf.utils.Address;
  toAddress?: cf.utils.Address;
  fromAddress?: cf.utils.Address;
}

export type AddressableLookupResolver = {
  (nodeState: NodeState, data: string): cf.channel.StateChannelInfo;
};

export type AddressableLookupResolverHash = {
  appId: AddressableLookupResolver;
  multisigAddress: AddressableLookupResolver;
  toAddress: AddressableLookupResolver;
  fromAddress?: AddressableLookupResolver;
};

export class InternalMessage {
  constructor(
    public actionName: cf.node.ActionName,
    public opCode: Opcode,
    public clientMessage: cf.node.ClientActionMessage,
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

export type InstructionMiddlewares = {
  [I in Opcode]: InstructionMiddleware[]
};
