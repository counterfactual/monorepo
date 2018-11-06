import * as cf from "@counterfactual/cf.js";

import { Instruction } from "./instructions";
import { State, Context } from "./state";

export interface MiddlewareResult {
  opCode: Instruction;
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
    state: State
  ): StateProposal;
}

export interface OpCodeResult {
  opCode: Instruction;
  value: any;
}

export class CfPeerAmount {
  constructor(readonly addr: string, public amount: number) {}
}

export interface Addressable {
  appId?: cf.utils.H256;
  multisigAddress?: cf.utils.Address;
  toAddress?: cf.utils.Address;
  fromAddress?: cf.utils.Address;
}

export type AddressableLookupResolver = {
  (state: State, data: string): cf.channel.StateChannelInfo;
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
    public opCode: Instruction,
    public clientMessage: cf.node.ClientActionMessage,
    public isAckSide: boolean
  ) {}
}

export type InstructionMiddlewareCallback = {
  (message: InternalMessage, next: Function, context: Context);
};

export interface InstructionMiddleware {
  scope: Instruction;
  method: InstructionMiddlewareCallback;
}

export type InstructionMiddlewares = {
  [I in Instruction]: InstructionMiddleware[]
};
