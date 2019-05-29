import { BigNumber } from "ethers/utils";

import { AppABIEncodings, AppInstanceInfo } from "./data-types";
import { AppInstanceID, SolidityABIEncoderV2Type } from "./simple-types";

export interface INodeProvider {
  onMessage(callback: (message: Node.Message) => void);
  sendMessage(message: Node.Message);
}

export namespace Node {
  export type NetworkContext = {
    // Protocol
    MultiSend: string;
    RootNonceRegistry: string;
    UninstallKeyRegistry: string;
    ChallengeRegistry: string;
    // App-specific
    ETHBalanceRefundApp: string;
  };

  export enum ErrorType {
    ERROR = "error"
  }

  // SOURCE: https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#public-methods
  export enum MethodName {
    ACCEPT_STATE = "acceptState",
    CREATE_CHANNEL = "createChannel",
    DEPOSIT = "deposit",
    GET_APP_INSTANCE_DETAILS = "getAppInstanceDetails",
    GET_APP_INSTANCES = "getAppInstances",
    GET_CHANNEL_ADDRESSES = "getChannelAddresses",
    GET_FREE_BALANCE_STATE = "getFreeBalanceState",
    GET_PROPOSED_APP_INSTANCES = "getProposedAppInstances",
    GET_STATE = "getState",
    INSTALL = "install",
    INSTALL_VIRTUAL = "installVirtual",
    PROPOSE_INSTALL = "proposeInstall",
    PROPOSE_INSTALL_VIRTUAL = "proposeInstallVirtual",
    PROPOSE_STATE = "proposeState",
    REJECT_INSTALL = "rejectInstall",
    REJECT_STATE = "rejectState",
    UPDATE_STATE = "updateState",
    TAKE_ACTION = "takeAction",
    UNINSTALL = "uninstall",
    UNINSTALL_VIRTUAL = "uninstallVirtual",
    WITHDRAW = "withdraw"
  }

  // SOURCE: https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#events
  export enum EventName {
    COUNTER_DEPOSIT_CONFIRMED = "counterDepositConfirmed",
    CREATE_CHANNEL = "createChannelEvent",
    DEPOSIT_CONFIRMED = "depositConfirmedEvent",
    DEPOSIT_FAILED = "depositFailed",
    DEPOSIT_STARTED = "depositStartedEvent",
    INSTALL = "installEvent",
    INSTALL_VIRTUAL = "installVirtualEvent",
    PROPOSE_STATE = "proposeStateEvent",
    REJECT_INSTALL = "rejectInstallEvent",
    REJECT_STATE = "rejectStateEvent",
    UNINSTALL = "uninstallEvent",
    UNINSTALL_VIRTUAL = "uninstallVirtualEvent",
    UPDATE_STATE = "updateStateEvent",
    WITHDRAWAL_CONFIRMED = "withdrawalConfirmedEvent",
    WITHDRAWAL_FAILED = "withdrawalFailed",
    WITHDRAWAL_STARTED = "withdrawalStartedEvent",
    PROPOSE_INSTALL = "proposeInstallEvent",
    PROPOSE_INSTALL_VIRTUAL = "proposeInstallVirtualEvent",
    PROTOCOL_MESSAGE_EVENT = "protocolMessageEvent",
    WITHDRAW_EVENT = "withdrawEvent",
    REJECT_INSTALL_VIRTUAL = "rejectInstallVirtualEvent"
  }

  export type CreateChannelParams = {
    owners: string[];
  };

  export type CreateChannelResult = {
    multisigAddress: string;
    owners: string[];
    counterpartyXpub: string;
  };

  export type CreateChannelTransactionResult = {
    transactionHash: string;
  };

  export type CreateMultisigParams = {
    owners: string[];
  };

  export type CreateMultisigResult = {
    multisigAddress: string;
  };

  export type DepositParams = {
    multisigAddress: string;
    amount: BigNumber;
    notifyCounterparty?: boolean;
  };

  export type DepositResult = {
    multisigBalance: BigNumber;
  };

  export type GetAppInstanceDetailsParams = {
    appInstanceId: AppInstanceID;
  };

  export type GetAppInstanceDetailsResult = {
    appInstance: AppInstanceInfo;
  };

  export type GetAppInstancesParams = {};

  export type GetAppInstancesResult = {
    appInstances: AppInstanceInfo[];
  };

  export type GetChannelAddressesParams = {};

  export type GetChannelAddressesResult = {
    multisigAddresses: string[];
  };

  export type GetFreeBalanceStateParams = {
    multisigAddress: string;
  };

  export type GetFreeBalanceStateResult = {
    [s: string]: BigNumber;
  };

  export type GetProposedAppInstancesParams = {};

  export type GetProposedAppInstancesResult = {
    appInstances: AppInstanceInfo[];
  };

  export type GetStateParams = {
    appInstanceId: AppInstanceID;
  };

  export type GetStateResult = {
    state: SolidityABIEncoderV2Type;
  };

  export type InstallParams = {
    appInstanceId: AppInstanceID;
  };

  export type InstallResult = {
    appInstance: AppInstanceInfo;
  };

  export type InstallVirtualParams = InstallParams & {
    intermediaries: string[];
  };

  export type InstallVirtualResult = InstallResult;

  export type ProposeInstallParams = {
    appId: string;
    abiEncodings: AppABIEncodings;
    myDeposit: BigNumber;
    peerDeposit: BigNumber;
    timeout: BigNumber;
    initialState: SolidityABIEncoderV2Type;
    proposedToIdentifier: string;
  };

  export type ProposeInstallVirtualParams = ProposeInstallParams & {
    intermediaries: string[];
  };

  export type ProposeInstallVirtualResult = ProposeInstallResult;

  export type ProposeInstallResult = {
    appInstanceId: AppInstanceID;
  };

  export type RejectInstallParams = {
    appInstanceId: AppInstanceID;
  };

  export type RejectInstallResult = {};

  export type TakeActionParams = {
    appInstanceId: AppInstanceID;
    action: SolidityABIEncoderV2Type;
  };

  export type TakeActionResult = {
    newState: SolidityABIEncoderV2Type;
  };

  export type UninstallParams = {
    appInstanceId: AppInstanceID;
  };

  export type UninstallResult = {};

  export type UninstallVirtualParams = UninstallParams & {
    intermediaryIdentifier: string;
  };

  export type UninstallVirtualResult = UninstallResult;

  export type UpdateStateParams = {
    appInstanceId: AppInstanceID;
    newState: SolidityABIEncoderV2Type;
  };

  export type UpdateStateResult = {
    newState: SolidityABIEncoderV2Type;
  };

  export type WithdrawParams = {
    multisigAddress: string;
    recipient?: string;
    amount: BigNumber;
  };

  export type WithdrawResult = {
    recipient: string;
    amount: BigNumber;
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
    | CreateChannelParams
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
    | CreateChannelResult
    | GetChannelAddressesResult;

  export type CreateMultisigEventData = {
    owners: string[];
    multisigAddress: string;
  };

  export type InstallEventData = {
    appInstanceId: AppInstanceID;
  };

  export type RejectInstallEventData = {
    appInstance: AppInstanceInfo;
  };

  export type UninstallEventData = {
    appInstanceId: string;
  };

  export type UpdateStateEventData = {
    appInstanceId: AppInstanceID;
    newState: SolidityABIEncoderV2Type;
    action?: SolidityABIEncoderV2Type;
  };

  export type WithdrawEventData = {
    amount: BigNumber;
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
