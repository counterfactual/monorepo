import { AppInstance } from "../app-instance";

export enum EventType {
  INSTALL = "install",
  INSTALL_VIRTUAL = "installVirtual",
  REJECT_INSTALL = "rejectInstall",
  CREATE_CHANNEL = "createChannel",
  CREATE_MULTISIG = "createMultisig",
  ERROR = "error"
}

type AppEventData = {
  appInstance: AppInstance;
};

export type InstallEventData = AppEventData;

export type RejectInstallEventData = AppEventData;

export type CreateMultisigEventData = {
  owners: string[];
  multisigAddress: string;
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
  | ErrorEventData
  | CreateMultisigEventData;

export type CounterfactualEvent = {
  readonly type: EventType;
  readonly data: EventData;
};
