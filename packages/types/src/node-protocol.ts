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
  export type NetworkContext = {
    // Protocol
    ConditionalTransaction: Address;
    MultiSend: Address;
    NonceRegistry: Address;
    AppRegistry: Address;
    // App-specific
    PaymentApp: Address;
    ETHBalanceRefund: Address;
  };

  export enum ErrorType {
    ERROR = "error"
  }

  // SOURCE: https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#public-methods
  export enum MethodName {
    GET_APP_INSTANCES = "getAppInstances",
    GET_PROPOSED_APP_INSTANCES = "getProposedAppInstances",
    PROPOSE_INSTALL = "proposeInstall",
    PROPOSE_INSTALL_VIRTUAL = "proposeInstallVirtual",
    REJECT_INSTALL = "rejectInstall",
    INSTALL = "install",
    INSTALL_VIRTUAL = "installVirtual",
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

  // The public facing events that the Node consumers can listen on.
  // SOURCE: https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#events
  export enum EventName {
    INSTALL = "installEvent",
    REJECT_INSTALL = "rejectInstallEvent",
    UPDATE_STATE = "updateStateEvent",
    UNINSTALL = "uninstallEvent",
    PROPOSE_STATE = "proposeStateEvent",
    REJECT_STATE = "rejectStateEvent",
    CREATE_MULTISIG = "createMultisigEvent"
  }

  export type GetAppInstancesParams = {};
  export type GetProposedAppInstancesParams = {};

  export type GetAppInstancesResult = {
    appInstances: AppInstanceInfo[];
  };
  export type GetProposedAppInstancesResult = {
    appInstances: AppInstanceInfo[];
  };

  export type ProposeInstallParams = {
    respondingAddress: Address;
    appId: Address;
    abiEncodings: AppABIEncodings;
    asset: BlockchainAsset;
    myDeposit: BigNumber;
    peerDeposit: BigNumber;
    timeout: BigNumber;
    initialState: AppState;
  };
  export type ProposeInstallResult = {
    appInstanceId: AppInstanceID;
  };

  export type ProposeInstallVirtualParams = ProposeInstallParams & {
    intermediaries: Address[];
  };
  export type ProposeInstallVirtualResult = ProposeInstallResult;

  export type RejectInstallParams = {
    appInstanceId: AppInstanceID;
  };
  export type RejectInstallResult = {};

  export type InstallParams = {
    appInstanceId: AppInstanceID;
  };
  export type InstallResult = {
    appInstance: AppInstanceInfo;
  };

  export type InstallVirtualParams = InstallParams & {
    intermediaries: Address[];
  };
  export type InstallVirtualResult = InstallResult;

  export type GetStateParams = {
    appInstanceId: AppInstanceID;
  };
  export type GetStateResult = {
    state: AppState;
  };

  export type GetAppInstanceDetailsParams = {
    appInstanceId: AppInstanceID;
  };
  export type GetAppInstanceDetailsResult = {
    appInstance: AppInstanceInfo;
  };

  export type TakeActionParams = {
    appInstanceId: AppInstanceID;
    action: AppAction;
  };
  export type TakeActionResult = {
    newState: AppState;
  };

  export type UninstallParams = {
    appInstanceId: AppInstanceID;
  };
  export type UninstallResult = {};

  export type CreateMultisigParams = {
    owners: Address[];
  };
  export type CreateMultisigResult = {
    multisigAddress: Address;
  };

  export type GetChannelAddressesParams = {};
  export type GetChannelAddressesResult = {
    multisigAddresses: Address[];
  };

  export type MethodParams =
    | GetAppInstancesParams
    | GetProposedAppInstancesParams
    | ProposeInstallParams
    | ProposeInstallVirtualParams
    | RejectInstallParams
    | InstallParams
    | InstallVirtualParams
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
    | ProposeInstallVirtualResult
    | RejectInstallResult
    | InstallResult
    | InstallVirtualResult
    | GetStateResult
    | GetAppInstanceDetailsResult
    | TakeActionResult
    | UninstallResult
    | CreateMultisigResult
    | GetChannelAddressesResult;

  export type InstallEventData = {
    appInstanceId: AppInstanceID;
  };
  export type RejectInstallEventData = {
    appInstance: AppInstanceInfo;
  };
  export type UpdateStateEventData = {
    appInstanceId: AppInstanceID;
    newState: AppState;
    oldState: AppState;
    action?: AppAction;
  };
  export type UninstallEventData = {
    appInstance: AppInstanceInfo;
  };
  export type CreateMultisigEventData = {
    owners: Address[];
    multisigAddress: Address;
  };

  export type EventData =
    | InstallEventData
    | RejectInstallEventData
    | UpdateStateEventData
    | UninstallEventData
    | CreateMultisigEventData;

  export type MethodMessage = {
    type: MethodName;
    requestId: string;
  };

  export type MethodRequest = MethodMessage & {
    params: MethodParams;
  };

  export type MethodResponse = MethodMessage & {
    result: MethodResult;
  };

  export type Event = {
    type: EventName;
    data: EventData;
  };

  export type Error = {
    type: ErrorType;
    requestId?: string;
    data: {
      errorName: string;
      message?: string;
      appInstanceId?: string;
      extra?: { [k: string]: string | number | boolean | object };
    };
  };

  export type Message = MethodRequest | MethodResponse | Event | Error;
}
