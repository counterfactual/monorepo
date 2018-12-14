import { ethers } from "ethers";

// FIXME: move operation action names away from client action names
// https://github.com/counterfactual/monorepo/issues/144
export enum ActionName {
  SETUP = "setup",
  INSTALL = "install",
  INSTALL_METACHANNEL_APP = "install_metachannel_app",
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
  constructor(readonly status: ResponseStatus) {}
}

export enum ResponseStatus {
  STARTED,
  ERROR,
  COMPLETED
}

export interface Notification {
  type: string;
  notificationType: string;
  data: any;
}

export interface ClientActionMessage {
  appInstanceId?: string;
  action: ActionName;
  data?: any;
  multisigAddress: string;
  toAddress: string;
  fromAddress: string;
  seq: number;
  signature?: ethers.utils.Signature;
}
