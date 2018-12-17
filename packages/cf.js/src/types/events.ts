import { Address, AppAction, AppState } from "@counterfactual/common-types";
import { BigNumber } from "ethers/utils";

import { AppInstance } from "../app-instance";

export enum EventType {
  INSTALL = "install",
  REJECT_INSTALL = "rejectInstall",
  UNINSTALL = "uninstall",
  UPDATE_STATE = "updateState",
  CREATE_MULTISIG = "createMultisig",
  ERROR = "error"
}

interface AppEventData {
  appInstance: AppInstance;
}

export interface InstallEventData extends AppEventData {}

export interface RejectInstallEventData extends AppEventData {}

export interface UninstallEventData extends AppEventData {
  myPayout: BigNumber;
  peerPayout: BigNumber;
}

export interface UpdateStateEventData extends AppEventData {
  oldState: AppState;
  newState: AppState;
  action?: AppAction;
}

export interface CreateMultisigEventData {
  owners: Address[];
  multisigAddress: Address;
}

export interface ErrorEventData {
  errorName: string;
  message?: string;
  appInstanceId?: string;
  extra?: { [k: string]: string | number | boolean | object };
}

export type EventData =
  | InstallEventData
  | RejectInstallEventData
  | UninstallEventData
  | UpdateStateEventData
  | ErrorEventData
  | CreateMultisigEventData;

export interface CounterfactualEvent {
  readonly type: EventType;
  readonly data: EventData;
}
