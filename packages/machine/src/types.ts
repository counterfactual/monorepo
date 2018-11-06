import * as cf from "@counterfactual/cf.js";

import { Instruction } from "./instructions";
import { CfFreeBalance, CfNonce } from "./middleware/cf-operation/types";
import { CfState, Context } from "./state";
import { Response, ResponseStatus } from "./vm";

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
  action: ActionName;
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
  stateChannel?: StateChannelInfo; // we should remove this from this object
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
  state: StateChannelInfos;
  cfAddr?: cf.utils.H256;
}

export type ProposerActionsHash = {
  [Name in ActionName]?: ContextualizedStateProposer
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
    stateChannel: StateChannelInfo;
  };
}

export interface FreeBalanceClientResponse extends ClientResponse {
  requestId: string;
  data: {
    freeBalance: CfFreeBalance;
  };
}

export interface InstallClientResponse extends ClientResponse {
  data: {
    appId: string;
  };
}

// Tree of all the stateChannel and appChannel state
export interface ChannelStates {
  [s: string]: StateChannelInfo;
}

export interface StateChannelInfo {
  counterParty: cf.utils.Address;
  me: cf.utils.Address;
  multisigAddress: cf.utils.Address;
  appChannels: AppInstanceInfos;
  freeBalance: CfFreeBalance;

  // TODO: Move this out of the datastructure
  // https://github.com/counterfactual/monorepo/issues/127
  /**
   * @returns the addresses of the owners of this state channel sorted
   *          in alphabetical order.
   */
  owners(): string[];
}

export interface AppInstanceInfo {
  // cf address
  id: cf.utils.H256;
  // used to generate cf address
  uniqueId: number;
  peerA: cf.utils.PeerBalance;
  peerB: cf.utils.PeerBalance;
  // ephemeral keys
  keyA?: cf.utils.Address;
  keyB?: cf.utils.Address;
  encodedState: any;
  appState?: any;
  appStateHash?: cf.utils.H256;
  localNonce: number;
  timeout: number;
  terms: cf.app.Terms;
  cfApp: cf.app.CfAppInterface;
  dependencyNonce: CfNonce;

  // TODO: Move this into a method that is outside the data structure
  // https://github.com/counterfactual/monorepo/issues/126
  stateChannel?: StateChannelInfo;
}

export interface StateChannelInfos {
  [s: string]: StateChannelInfo;
}

export interface AppInstanceInfos {
  [s: string]: AppInstanceInfo;
}

export interface OpCodeResult {
  opCode: Instruction;
  value: any;
}

// TODO: document what this is
// https://github.com/counterfactual/monorepo/issues/125
export interface ResponseSink {
  sendResponse(res: Response);
}

export class CfPeerAmount {
  constructor(readonly addr: string, public amount: number) {}
}

// FIXME: move operation action names away from client action names
// https://github.com/counterfactual/monorepo/issues/144
export enum ActionName {
  SETUP = "setup",
  INSTALL = "install",
  UPDATE = "update",
  UNINSTALL = "uninstall",
  DEPOSIT = "deposit",
  ADD_OBSERVER = "addObserver",
  REMOVE_OBSERVER = "removeObserver",
  REGISTER_IO = "registerIo",
  RECEIVE_IO = "receiveIo",
  QUERY = "query",
  CONNECT = "connect"
}

export interface Addressable {
  appId?: cf.utils.H256;
  multisigAddress?: cf.utils.Address;
  toAddress?: cf.utils.Address;
  fromAddress?: cf.utils.Address;
}

export type AddressableLookupResolver = {
  (state: CfState, data: string): StateChannelInfo;
};

export type AddressableLookupResolverHash = {
  appId: AddressableLookupResolver;
  multisigAddress: AddressableLookupResolver;
  toAddress: AddressableLookupResolver;
  fromAddress?: AddressableLookupResolver;
};

export class InternalMessage {
  constructor(
    public actionName: ActionName,
    public opCode: Instruction,
    public clientMessage: ClientActionMessage,
    public isAckSide: boolean
  ) {}
}

export class WalletMessage {
  constructor(id: string, status: ResponseStatus, readonly type?: string) {}
}

export class WalletResponse {
  constructor(
    readonly requestId: string,
    readonly status: ResponseStatus,
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
