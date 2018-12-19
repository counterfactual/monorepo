// TODO: Probably merge this file with ./types.ts

import { AppInterface, Terms } from "@counterfactual/types";
import { BigNumber, Signature } from "ethers/utils";

import { Protocol } from "./types";

export type StateData = {
  [x: string]: string | number | boolean | StateData | StateDataArray;
};

// I think this should be a `type` not an `interface` but self-referencial
// types is not supported: github.com/Microsoft/TypeScript/issues/6230
export interface StateDataArray
  extends Array<string | number | boolean | StateData | StateDataArray> {}

export type ProtocolMessage = {
  protocol: Protocol;
  multisigAddress: string;
  params: ProtocolParameters;
  fromAddress: string;
  toAddress: string;
  seq: number;
  signature?: Signature;
};

export type SetupData = {};

export type UpdateData = {
  appInstanceId: string;
  newState: StateData;
};

export type InstallData = {
  aliceBalanceDecrement: BigNumber;
  bobBalanceDecrement: BigNumber;
  signingKeys: string[];
  initialState: StateData;
  terms: Terms;
  appInterface: AppInterface;
  defaultTimeout: number;
};

export type UninstallData = {
  appInstanceId: string;
  aliceBalanceIncrement: BigNumber;
  bobBalanceIncrement: BigNumber;
};

export type MetaChannelInstallAppData = {
  /* TODO: @xuanji */
};

type ProtocolParameters =
  | SetupData
  | UpdateData
  | InstallData
  | UninstallData
  | MetaChannelInstallAppData;
