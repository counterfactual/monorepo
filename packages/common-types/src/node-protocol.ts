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
    GET_PROPOSED_APP_INSTANCES = "getProposedAppInstances",
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
    CREATE_MULTISIG = "createMultisig",
    GET_CHANNEL_ADDRESSES = "getChannelAddresses"
  }

  // SOURCE: https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#events
  export enum EventName {
    INSTALL = "installEvent",
    REJECT_INSTALL = "rejectInstallEvent",
    UPDATE_STATE = "updateStateEvent",
    UNINSTALL = "uninstallEvent",
    PROPOSE_STATE = "proposeStateEvent",
    REJECT_STATE = "rejectStateEvent",
    MULTISIG_CREATED = "createMultisigEvent"
  }

  export interface GetAppInstancesParams {}
  export interface GetProposedAppInstancesParams {}

  export interface GetAppInstancesResult {
    appInstances: AppInstanceInfo[];
  }
  export interface GetProposedAppInstancesResult {
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

  export interface GetChannelAddressesParams {}
  export interface GetChannelAddressesResult {
    multisigAddresses: Address[];
  }

  export type MethodParams =
    | GetAppInstancesParams
    | GetProposedAppInstancesParams
    | ProposeInstallParams
    | RejectInstallParams
    | InstallParams
    | GetStateParams
    | GetAppInstanceDetailsParams
    | TakeActionParams
    | UninstallParams
    | CreateMultisigParams
    | GetChannelAddressesParams;
  export type MethodResult =
    | GetAppInstancesResult
    | GetProposedAppInstancesResult
    | ProposeInstallResult
    | RejectInstallResult
    | InstallResult
    | GetStateResult
    | GetAppInstanceDetailsResult
    | TakeActionResult
    | UninstallResult
    | CreateMultisigResult
    | GetChannelAddressesResult;

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
  export interface CreateMultisigEventData {
    owners: Address[];
    multisigAddress: Address;
  }

  export type EventData =
    | InstallEventData
    | RejectInstallEventData
    | UpdateStateEventData
    | UninstallEventData
    | CreateMultisigEventData;

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
      appInstanceId?: string;
      extra?: { [k: string]: string | number | boolean | object };
    };
  }

  export type Message = MethodRequest | MethodResponse | Event | Error;
}
