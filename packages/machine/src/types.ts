import * as ethers from "ethers";
import lodash from "lodash";

import { Instruction } from "./instructions";
import {
  CfAppInterface,
  CfFreeBalance,
  CfNonce,
  Terms
} from "./middleware/cf-operation/types";
import { CfState, Context } from "./state";
import { PeerBalance } from "./utils/peer-balance";
import { Signature } from "./utils/signature";
import { Response, ResponseStatus } from "./vm";

/**
 * Aliases to help code readability.
 * Byte arrays and addresses are represented as hex-encoded strings.
 * Should think about actually changing these to be non strings.
 */
export type Bytes = string; // dynamically-sized byte array
export type Bytes4 = string; // fixed-size byte arrays
export type Bytes32 = string;
export type Address = string; // ethereum address (i.e. rightmost 20 bytes of keccak256 of ECDSA pubkey)
export type H256 = string; // a bytes32 which is the output of the keccak256 hash function

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
  signature?: Signature;
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
  multisigAddress?: Address;
}

export interface InstallData {
  peerA: PeerBalance;
  peerB: PeerBalance;
  keyA?: Address;
  keyB?: Address;
  encodedAppState: Bytes;
  terms: Terms;
  app: CfAppInterface;
  timeout: number;
}

/**
 * The return value from the STATE_TRANSITION_PROPOSE middleware.
 */
export interface StateProposal {
  state: StateChannelInfos;
  cfAddr?: H256;
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

export interface UpdateData {
  encodedAppState: string;
  /**
   * Hash of the State struct specific to a given application.
   */
  appStateHash: H256;
}

export interface UpdateOptions {
  state: object;
}

export interface UninstallOptions {
  peerABalance: ethers.utils.BigNumber;
  peerBBalance: ethers.utils.BigNumber;
}

export interface InstallOptions {
  appAddress: string;
  stateEncoding: string;
  abiEncoding: string;
  state: object;
  peerABalance: ethers.utils.BigNumber;
  peerBBalance: ethers.utils.BigNumber;
}

/**
 * peerA is always the address first in alphabetical order.
 */
export class CanonicalPeerBalance {
  public static canonicalize(
    peer1: PeerBalance,
    peer2: PeerBalance
  ): CanonicalPeerBalance {
    if (peer2.address.localeCompare(peer1.address) < 0) {
      return new CanonicalPeerBalance(peer2, peer1);
    }
    return new CanonicalPeerBalance(peer1, peer2);
  }

  constructor(readonly peerA: PeerBalance, readonly peerB: PeerBalance) {}
}

// Tree of all the stateChannel and appChannel state
export interface ChannelStates {
  [s: string]: StateChannelInfo;
}

export interface StateChannelInfo {
  counterParty: Address;
  me: Address;
  multisigAddress: Address;
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
  id: H256;
  // used to generate cf address
  uniqueId: number;
  peerA: PeerBalance;
  peerB: PeerBalance;
  // ephemeral keys
  keyA?: Address;
  keyB?: Address;
  encodedState: any;
  appState?: any;
  appStateHash?: H256;
  localNonce: number;
  timeout: number;
  terms: Terms;
  cfApp: CfAppInterface;
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
  appId?: H256;
  multisigAddress?: Address;
  toAddress?: Address;
  fromAddress?: Address;
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
