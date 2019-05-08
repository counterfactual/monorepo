import { Address, SolidityABIEncoderV2Type } from "@counterfactual/types";

import { AppInstance } from "../app-instance";

export enum EventType {
  INSTALL = "install",
  INSTALL_VIRTUAL = "installVirtual",
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
  newState: SolidityABIEncoderV2Type;
  action?: SolidityABIEncoderV2Type;
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
