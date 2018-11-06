import * as cf from "@counterfactual/cf.js";

import { Instruction } from "./instructions";
import { CfState, Context } from "./state";

export interface MiddlewareResult {
  opCode: Instruction;
  value: any;
}

export interface WalletMessaging {
  postMessage(message: Object);

  onMessage(callback: Function);
}

export interface ClientMessage {
  requestId: string;
  appId?: string;
  appName?: string;
  type?: string;
  action: cf.node.ActionName;
}

export interface Notification {
  type: string;
  notificationType: string;
  data: any;
}

export interface ClientActionMessage extends ClientMessage {
  data?: any;
  multisigAddress: string;
  toAddress: string;
  fromAddress: string;
  stateChannel?: cf.channel.StateChannelInfo; // we should remove this from this object
  seq: number;
  signature?: cf.utils.Signature;
}

export enum ClientQueryType {
  FreeBalance = "freeBalance",
  StateChannel = "stateChannel",
  User = "user"
}

export interface ClientQuery extends ClientMessage {
  requestId: string;
  query: ClientQueryType;
  data?: any;
  userId?: string;
  multisigAddress?: cf.utils.Address;
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
    state: CfState
  ): StateProposal;
}

export interface ClientResponse {
  requestId: string;
  // TODO: tighten the type
  // https://github.com/counterfactual/monorepo/issues/128
  status?: any;
  data?: any;
  appId?: string;
}

export interface UserDataClientResponse extends ClientResponse {
  data: {
    userAddress: string;
    networkContext: Map<string, string>;
  };
}

export interface StateChannelDataClientResponse extends ClientResponse {
  data: {
    stateChannel: cf.channel.StateChannelInfo;
  };
}

export interface FreeBalanceClientResponse extends ClientResponse {
  requestId: string;
  data: {
    freeBalance: cf.utils.CfFreeBalance;
  };
}

export interface InstallClientResponse extends ClientResponse {
  data: {
    appId: string;
  };
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
  (state: CfState, data: string): cf.channel.StateChannelInfo;
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
    public clientMessage: ClientActionMessage,
    public isAckSide: boolean
  ) {}
}

export class WalletMessage {
  constructor(
    id: string,
    status: cf.node.ResponseStatus,
    readonly type?: string
  ) {}
}

export class WalletResponse {
  constructor(
    readonly requestId: string,
    readonly status: cf.node.ResponseStatus,
    readonly type?: string,
    error?: string
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
