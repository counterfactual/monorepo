import { BigNumber } from "ethers/utils";

import {
  AppABIEncodings,
  AppInstanceInfo,
  BlockchainAsset
} from "./data-types";
import { Address, AppAction, AppInstanceID, AppState } from "./simple-types";

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
    REJECT_STATE = "rejectState",
    CREATE_MULTISIG = "createMultisig"
  }

  // SOURCE: https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#events
  export enum EventName {
    INSTALL = "install",
    REJECT_INSTALL = "rejectInstall",
    UPDATE_STATE = "updateState",
    UNINSTALL = "uninstall",
    PROPOSE_STATE = "proposeState",
    REJECT_STATE = "rejectState",
    MULTISIG_CREATED = "multisigCreated"
  }

  export interface GetAppInstancesParams {}

  export interface GetAppInstancesResult {
    appInstances: AppInstanceInfo[];
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
  export interface ProposeInstallResult {
    appInstanceId: AppInstanceID;
  }

  export interface RejectInstallParams {
    appInstanceId: AppInstanceID;
  }
  export interface RejectInstallResult {}

  export interface InstallParams {
    appInstanceId: AppInstanceID;
  }
  export interface InstallResult {
    appInstance: AppInstanceInfo;
  }

  export interface GetStateParams {
    appInstanceId: AppInstanceID;
  }
  export interface GetStateResult {
    state: AppState;
  }

  export interface GetAppInstanceDetailsParams {
    appInstanceId: AppInstanceID;
  }
  export interface GetAppInstanceDetailsResult {
    appInstance: AppInstanceInfo;
  }

  export interface TakeActionParams {
    appInstanceId: AppInstanceID;
    action: AppAction;
  }
  export interface TakeActionResult {
    newState: AppState;
  }

  export interface UninstallParams {
    appInstanceId: AppInstanceID;
  }
  export interface UninstallResult {
    myPayout: BigNumber;
    peerPayout: BigNumber;
  }

  export interface CreateMultisigParams {
    owners: Address[];
  }
  export interface CreateMultisigResult {
    multisigAddress: Address;
  }

  export type MethodParams =
    | GetAppInstancesParams
    | ProposeInstallParams
    | RejectInstallParams
    | InstallParams
    | GetStateParams
    | GetAppInstanceDetailsParams
    | TakeActionParams
    | UninstallParams
    | CreateMultisigParams;
  export type MethodResult =
    | GetAppInstancesResult
    | ProposeInstallResult
    | RejectInstallResult
    | InstallResult
    | GetStateResult
    | GetAppInstanceDetailsResult
    | TakeActionResult
    | UninstallResult
    | CreateMultisigResult;

  export interface InstallEventData {
    appInstanceId: AppInstanceID;
  }
  export interface RejectInstallEventData {
    appInstance: AppInstanceInfo;
  }
  export interface UpdateStateEventData {
    appInstanceId: AppInstanceID;
    newState: AppState;
    oldState: AppState;
    action?: AppAction;
  }
  export interface UninstallEventData {
    appInstance: AppInstanceInfo;
    myPayout: BigNumber;
    peerPayout: BigNumber;
  }

  export type EventData =
    | InstallEventData
    | RejectInstallEventData
    | UpdateStateEventData
    | UninstallEventData;

  export interface MethodMessage {
    type: MethodName;
    requestId: string;
  }

  export interface MethodRequest extends MethodMessage {
    params: MethodParams;
  }

  export interface MethodResponse extends MethodMessage {
    result: MethodResult;
  }

  export interface Event {
    type: EventName;
    data: EventData;
  }

  export interface Error {
    type: ErrorType;
    requestId?: string;
    data: {
      errorName: string;
      message?: string;
    };
  }

  export type Message = MethodRequest | MethodResponse | Event | Error;
}
