import * as ethers from "ethers";

import { StateChannelInfo } from "../channel";
import { Address, FreeBalance } from "../utils";

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

// TODO: document what this is
// https://github.com/counterfactual/monorepo/issues/125
export interface ResponseSink {
  sendResponse(res: Response): void;
}

export class Response {
  constructor(
    readonly requestId: string,
    readonly status: ResponseStatus,
    error?: string
  ) {}
}

export enum ResponseStatus {
  STARTED,
  ERROR,
  COMPLETED
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
  signature?: ethers.utils.Signature;
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
    freeBalance: FreeBalance;
  };
}

export interface InstallClientResponse extends ClientResponse {
  data: {
    appId: string;
  };
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
