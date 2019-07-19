import { SolidityABIEncoderV2Type } from "@counterfactual/types";
import { BigNumber, BigNumberish } from "ethers/utils";

import { GameState, HighRollerAppState } from "./game-types";
import { AppInstance } from "./mock-app-instance";

export type ABIEncoding = string;
export type Address = string;
export type Bytes32 = string;

export interface SignedStateHashUpdate {
  stateHash: string;
  versionNumber: number;
  timeout: number;
  signatures: string;
}

export type AppInstanceInfo = {
  identityHash: string;
  appDefinition: Address;
  abiEncodings: AppABIEncodings;
  initiatorDeposit: BigNumber;
  responderDeposit: BigNumber;
  timeout: BigNumber;
  intermediaries?: Address[];
};

export type AppABIEncodings = {
  stateEncoding: ABIEncoding;
  actionEncoding?: ABIEncoding;
};

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
    PROPOSE_INSTALL_VIRTUAL = "proposeInstallVirtual",
    REJECT_INSTALL = "rejectInstall",
    INSTALL = "install",
    INSTALL_VIRTUAL = "installVirtual",
    GET_STATE = "getState",
    GET_APP_INSTANCE_DETAILS = "getAppInstanceDetails",
    TAKE_ACTION = "takeAction",
    UNINSTALL = "uninstall",
    UNINSTALL_VIRTUAL = "uninstallVirtual",
    PROPOSE_STATE = "proposeState",
    ACCEPT_STATE = "acceptState",
    REJECT_STATE = "rejectState",
    CREATE_MULTISIG = "createMultisig",
    GET_CHANNEL_ADDRESSES = "getChannelAddresses",
    MATCHMAKE = "matchmake"
  }

  // SOURCE: https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#events
  export enum EventName {
    INSTALL = "installEvent",
    REJECT_INSTALL = "rejectInstallEvent",
    UPDATE_STATE = "updateStateEvent",
    UNINSTALL = "uninstallEvent",
    PROPOSE_STATE = "proposeStateEvent",
    REJECT_STATE = "rejectStateEvent",
    CREATE_MULTISIG = "createMultisigEvent",
    MATCH_MADE = "matchmade"
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
    responderAddress: Address;
    appDefinition: Address;
    abiEncodings: AppABIEncodings;
    initiatorDeposit: BigNumber;
    responderDeposit: BigNumber;
    timeout: BigNumber;
    initialState: SolidityABIEncoderV2Type;
  };
  export type ProposeInstallResult = {
    appInstanceId: string;
  };

  export type ProposeInstallVirtualParams = ProposeInstallParams & {
    intermediaries: Address[];
  };
  export type ProposeInstallVirtualResult = ProposeInstallResult;

  export type RejectInstallParams = {
    appInstanceId: string;
  };
  export type RejectInstallResult = {};

  export type InstallParams = {
    appInstanceId: string;
  };
  export type InstallResult = {
    appInstance: AppInstanceInfo;
  };

  export type InstallVirtualParams = InstallParams & {
    intermediaries: Address[];
  };
  export type InstallVirtualResult = InstallResult;

  export type GetStateParams = {
    appInstanceId: string;
  };
  export type GetStateResult = {
    state: SolidityABIEncoderV2Type;
  };

  export type GetAppInstanceDetailsParams = {
    appInstanceId: string;
  };
  export type GetAppInstanceDetailsResult = {
    appInstance: AppInstanceInfo;
  };

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
    appInstance: { id: string };
  };
  export type RejectInstallEventData = {
    appInstance: AppInstanceInfo;
  };
  export type UpdateStateEventData = {
    appInstanceId: string;
    newState: SolidityABIEncoderV2Type;
    action?: SolidityABIEncoderV2Type;
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

// keep in sync with cf.js/src/app-factory.ts
export namespace cf {
  export type AppFactory = {
    new (
      appID: string,
      encodings: AppABIEncodings,
      provider: cf.Provider
    ): AppFactory;
    proposeInstall(parameters: {
      proposedToIdentifier: Address;
      initiatorDeposit: BigNumberish;
      responderDeposit: BigNumberish;
      initialState: SolidityABIEncoderV2Type;
    }): Promise<string>;
    proposeInstallVirtual(parameters: {
      proposedToIdentifier: Address;
      initiatorDeposit: BigNumberish;
      responderDeposit: BigNumberish;
      initialState: SolidityABIEncoderV2Type;
      intermediaries: Address[];
      timeout: number;
    }): Promise<string>;
  };

  export type Provider = {
    once: (eventName: any, callback: (data: Node.EventData) => void) => void;
    on: (eventName: any, callback: (data: Node.EventData) => void) => void;
    callRawNodeMethod: (
      methodName: Node.MethodName,
      params: Node.MethodParams
    ) => Promise<Node.MethodResponse>;
    appInstances: { [appInstanceId: string]: AppInstance };
    nodeProvider: NodeProvider;
    getOrCreateAppInstance: (
      id: string,
      info: AppInstance
    ) => Promise<AppInstance>;
  };
  export type NodeProvider = {
    new (): NodeProvider;
    isConnected;
    eventEmitter;
    messagePort?;
    debugMode;
    debugEmitter;
    constructor();
    detectDebugMode;
    log;
    onMessage(callback: (message: Node.Message) => void): void;
    sendMessage(message: Node.Message): void;
    connect(): Promise<NodeProvider>;
    startMessagePort;
    notifyNodeProviderIsConnected;
  };
}

export type HighRollerUIMutableState = {
  myRoll?: number[];
  opponentRoll?: number[];
  myScore?: number;
  opponentScore?: number;
  gameState?: GameState;
  highRollerState?: HighRollerAppState;
};

export type HighRollerUIState = HighRollerUIMutableState & {
  updateUIState: (state: HighRollerUIMutableState) => void;
  highRoller: (
    num1: number,
    num2: number
  ) => Promise<{ myRoll: number[]; opponentRoll: number[] }>;
  generateRandomRoll: () => number[];
};
