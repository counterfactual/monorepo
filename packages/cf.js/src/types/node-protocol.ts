import { BigNumber } from "ethers/utils";

import {
  AppABIEncodings,
  AppInstanceInfo,
  BlockchainAsset
} from "./data-types";
import { Address, AppInstanceID, AppState } from "./simple-types";

export interface INodeProvider {
  onMessage(callback: (message: NodeMessage) => void);
  sendMessage(message: NodeMessage);
}

export enum NodeErrorType {
  ERROR = "error"
}

// SOURCE: https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#public-methods
export enum NodeMethodName {
  GET_APP_INSTANCES = "getAppInstances",
  PROPOSE_INSTALL = "proposeInstall",
  REJECT_INSTALL = "rejectInstall",
  INSTALL = "install",
  GET_STATE = "getState",
  GET_APP_INSTANCE_DETAILS = "getAppInstanceDetails",
  TAKE_ACTION = "takeAction",
  UNINSTALL = "uninstall",
  PROPOSE_STATE = "proposeState",
  ACCEPT_STATE = "acceptState",
  REJECT_STATE = "rejectState"
}

// SOURCE: https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#events
export enum NodeEventName {
  INSTALL = "install",
  REJECT_INSTALL = "rejectInstall",
  UPDATE_STATE = "updateState",
  UNINSTALL = "uninstall",
  PROPOSE_STATE = "proposeState",
  REJECT_STATE = "rejectState"
}

export interface ProposeInstallParams {
  peerAddress: Address;
  appId: Address;
  abiEncodings: AppABIEncodings;
  asset: BlockchainAsset;
  myDeposit: BigNumber;
  peerDeposit: BigNumber;
  timeout: BigNumber;
  initialState: AppState;
}

export interface GetAppInstancesParams {}

export interface ProposeInstallResult {
  appInstanceId: AppInstanceID;
}

export interface GetAppInstancesResult {
  appInstances: AppInstanceInfo[];
}

export interface NodeError {
  type: NodeErrorType.ERROR;
  requestId?: string;
  data: {
    errorName: string;
    message?: string;
  };
}

export interface InstallEventData {
  appInstanceId: AppInstanceID;
}

export type NodeEventData = InstallEventData;

export type NodeMethodParams = GetAppInstancesParams | ProposeInstallParams;
export type NodeMethodResult = GetAppInstancesResult | ProposeInstallResult;

interface NodeMethodMessage {
  type: NodeMethodName;
  requestId: string;
}

export interface NodeMethodRequest extends NodeMethodMessage {
  params: NodeMethodParams;
}

export interface NodeMethodResponse extends NodeMethodMessage {
  result: NodeMethodResult;
}

export interface NodeEvent {
  type: NodeEventName;
  data: NodeEventData;
}

export type NodeMessage =
  | NodeMethodRequest
  | NodeMethodResponse
  | NodeError
  | NodeEvent;
