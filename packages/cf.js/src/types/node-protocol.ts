import { BigNumber } from "ethers/utils";

import {
  AppABIEncodings,
  AppInstanceInfo,
  BlockchainAsset
} from "./data-types";
import { Address, AppInstanceID, AppState } from "./simple-types";

export interface INodeProvider {
  onMessage(callback: (message: Node.Message) => void);
  sendMessage(message: Node.Message);
}

export namespace Node {
  export enum ErrorType {
    ERROR = "error"
  }

  // SOURCE: https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#public-methods
  export enum MethodName {
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
  export enum EventName {
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

  export interface Error {
    type: ErrorType.ERROR;
    requestId?: string;
    data: {
      errorName: string;
      message?: string;
    };
  }

  export interface InstallEventData {
    appInstanceId: AppInstanceID;
  }

  export type EventData = InstallEventData;

  export type MethodParams = GetAppInstancesParams | ProposeInstallParams;
  export type MethodResult = GetAppInstancesResult | ProposeInstallResult;

  interface NodeMethodMessage {
    type: MethodName;
    requestId: string;
  }

  export interface MethodRequest extends NodeMethodMessage {
    params: MethodParams;
  }

  export interface MethodResponse extends NodeMethodMessage {
    result: MethodResult;
  }

  export interface Event {
    type: EventName;
    data: EventData;
  }

  export type Message = MethodRequest | MethodResponse | Error | Event;
}
