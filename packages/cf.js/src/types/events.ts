import { Address, AppAction, AppState } from "@counterfactual/types";

import { AppInstance } from "../app-instance";

export enum EventType {
  INSTALL = "install",
  REJECT_INSTALL = "rejectInstall",
  UNINSTALL = "uninstall",
  UPDATE_STATE = "updateState",
  CREATE_MULTISIG = "createMultisig",
  ERROR = "error"
}

type AppEventData = {
  appInstance: AppInstance;
};

export type InstallEventData = AppEventData;

export type RejectInstallEventData = AppEventData;

export type UninstallEventData = AppEventData;

export type UpdateStateEventData = AppEventData & {
  oldState: AppState;
  newState: AppState;
  action?: AppAction;
};

export type CreateMultisigEventData = {
  owners: Address[];
  multisigAddress: Address;
};

export type ErrorEventData = {
  errorName: string;
  message?: string;
  appInstanceId?: string;
  extra?: { [k: string]: string | number | boolean | object };
};

export type EventData =
  | InstallEventData
  | RejectInstallEventData
  | UninstallEventData
  | UpdateStateEventData
  | ErrorEventData
  | CreateMultisigEventData;

export type CounterfactualEvent = {
  readonly type: EventType;
  readonly data: EventData;
};
