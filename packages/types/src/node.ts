import { BigNumber } from "ethers/utils";
import { JsonRpcNotification, JsonRpcResponse, Rpc } from "rpc-server";

import { OutcomeType } from ".";
import {
  AppABIEncodings,
  AppInstanceJson,
  AppInstanceProposal
} from "./data-types";
import { SolidityABIEncoderV2Type } from "./simple-types";

export interface INodeProvider {
  onMessage(callback: (message: Node.Message) => void);
  sendMessage(message: Node.Message);
}

export interface IRpcNodeProvider {
  onMessage(callback: (message: JsonRpcResponse | JsonRpcNotification) => void);
  sendMessage(message: Rpc);
}

export namespace Node {
  /**
   * The message type for Nodes to communicate with each other.
   */
  export type NodeMessage = {
    from: string;
    type: EventName;
  };

  export interface ServiceFactory {
    connect?(host: string, port: string): ServiceFactory;
    auth?(email: string, password: string): Promise<void>;
    createMessagingService?(messagingServiceKey: string): IMessagingService;
    createStoreService?(storeServiceKey: string): IStoreService;
  }

  export interface IMessagingService {
    send(to: string, msg: Node.NodeMessage): Promise<void>;
    onReceive(address: string, callback: (msg: Node.NodeMessage) => void);
  }

  /**
   * An interface for a stateful storage service with an API very similar to Firebase's API.
   * Values are addressed by paths, which are separated by the forward slash separator `/`.
   * `get` must return values whose paths have prefixes that match the provided path,
   * keyed by the remaining path.
   * `set` allows multiple values and paths to be atomically set. In Firebase, passing `null`
   * as `value` deletes the entry at the given prefix, and passing objects with null subvalues
   * deletes entries at the path extended by the subvalue's path within the object. `set` must
   * have the same behaviour if the `allowDelete` flag is passed; otherwise, any null values or
   * subvalues throws an error.
   * todo(xuanji): rename `key` to `path`
   */
  export interface IStoreService {
    get(key: string): Promise<any>;
    set(
      pairs: { key: string; value: any }[],
      allowDelete?: Boolean
    ): Promise<void>;
    reset?(): Promise<void>;
  }

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
    GET_STATE_DEPOSIT_HOLDER_ADDRESS = "getStateDepositHolderAddress",
    GET_FREE_BALANCE_STATE = "getFreeBalanceState",
    GET_PROPOSED_APP_INSTANCE = "getProposedAppInstance",
    GET_PROPOSED_APP_INSTANCES = "getProposedAppInstances",
    GET_STATE = "getState",
    GET_STATE_CHANNEL = "getStateChannel",
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

  export enum RpcMethodName {
    CREATE_CHANNEL = "chan_create",
    DEPOSIT = "chan_deposit",
    GET_APP_INSTANCE_DETAILS = "chan_getAppInstance",
    GET_APP_INSTANCES = "chan_getAppInstances",
    GET_STATE_DEPOSIT_HOLDER_ADDRESS = "chan_getStateDepositHolderAddress",
    GET_FREE_BALANCE_STATE = "chan_getFreeBalanceState",
    GET_PROPOSED_APP_INSTANCES = "chan_getProposedAppInstances",
    GET_STATE = "chan_getState",
    INSTALL = "chan_install",
    INSTALL_VIRTUAL = "chan_installVirtual",
    PROPOSE_INSTALL = "chan_proposeInstall",
    PROPOSE_INSTALL_VIRTUAL = "chan_proposeInstallVirtual",
    PROPOSE_STATE = "chan_proposeState",
    REJECT_INSTALL = "chan_rejectInstall",
    REJECT_STATE = "chan_rejectState",
    UPDATE_STATE = "chan_updateState",
    TAKE_ACTION = "chan_takeAction",
    UNINSTALL = "chan_uninstall",
    UNINSTALL_VIRTUAL = "chan_uninstallVirtual",
    WITHDRAW = "chan_withdraw"
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
    tokenAddress?: string;
    notifyCounterparty?: boolean;
  };

  export type DepositResult = {
    multisigBalance: BigNumber;
  };

  export type GetAppInstanceDetailsParams = {
    appInstanceId: string;
  };

  export type GetAppInstanceDetailsResult = {
    appInstance: AppInstanceJson;
  };

  export type GetStateDepositHolderAddressParams = {
    owners: string[];
  };

  export type GetStateDepositHolderAddressResult = {
    address: string;
  };

  export type GetAppInstancesParams = {};

  export type GetAppInstancesResult = {
    appInstances: AppInstanceJson[];
  };

  export type GetChannelAddressesParams = {};

  export type GetChannelAddressesResult = {
    multisigAddresses: string[];
  };

  export type GetFreeBalanceStateParams = {
    multisigAddress: string;
    tokenAddress?: string;
  };

  export type GetFreeBalanceStateResult = {
    [s: string]: BigNumber;
  };

  export type GetProposedAppInstancesParams = {};

  export type GetProposedAppInstancesResult = {
    appInstances: AppInstanceProposal[];
  };

  export type GetProposedAppInstanceParams = {
    appInstanceId: string;
  };

  export type GetProposedAppInstanceResult = {
    appInstance: AppInstanceProposal;
  };

  export type GetStateParams = {
    appInstanceId: string;
  };

  export type GetStateResult = {
    state: SolidityABIEncoderV2Type;
  };

  export type InstallParams = {
    appInstanceId: string;
  };

  export type InstallResult = {
    appInstance: AppInstanceJson;
  };

  export type InstallVirtualParams = InstallParams & {
    intermediaries: string[];
  };

  export type InstallVirtualResult = InstallResult;

  export type ProposeInstallParams = {
    appDefinition: string;
    abiEncodings: AppABIEncodings;
    initiatorDeposit: BigNumber;
    responderDeposit: BigNumber;
    timeout: BigNumber;
    initialState: SolidityABIEncoderV2Type;
    proposedToIdentifier: string;
    outcomeType: OutcomeType;
  };

  export type ProposeInstallVirtualParams = ProposeInstallParams & {
    intermediaries: string[];
  };

  export type ProposeInstallVirtualResult = ProposeInstallResult;

  export type ProposeInstallResult = {
    appInstanceId: string;
  };

  export type RejectInstallParams = {
    appInstanceId: string;
  };

  export type RejectInstallResult = {};

  export type TakeActionParams = {
    appInstanceId: string;
    action: SolidityABIEncoderV2Type;
  };

  export type TakeActionResult = {
    newState: SolidityABIEncoderV2Type;
  };

  export type UninstallParams = {
    appInstanceId: string;
  };

  export type UninstallResult = {};

  export type UninstallVirtualParams = UninstallParams & {
    intermediaryIdentifier: string;
  };

  export type UninstallVirtualResult = UninstallResult;

  export type UpdateStateParams = {
    appInstanceId: string;
    newState: SolidityABIEncoderV2Type;
  };

  export type UpdateStateResult = {
    newState: SolidityABIEncoderV2Type;
  };

  export type WithdrawParams = {
    multisigAddress: string;
    recipient?: string;
    amount: BigNumber;
    tokenAddress?: string;
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
    appInstanceId: string;
  };

  export type RejectInstallEventData = {
    appInstance: AppInstanceProposal;
  };

  export type UninstallEventData = {
    appInstanceId: string;
  };

  export type UpdateStateEventData = {
    appInstanceId: string;
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
