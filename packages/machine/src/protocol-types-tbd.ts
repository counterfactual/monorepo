// TODO: Probably merge this file with ./types.ts

import { AppInterface, Terms } from "@counterfactual/types";
import { BigNumber, Signature } from "ethers/utils";

import { Protocol } from "./types";

// The application-specific state of an app instance, to be interpreted by the
// app developer. We just treat it as an opaque blob; however since we pass this
// around in protocol messages and include this in transaction data in disputes,
// we impose some restrictions on the type; they must be serializable both as
// JSON and as solidity structs.
// todo(ldct): top-level arrays are probably illegal since they are not
// structs...
export type AppState = {
  [x: string]: string | number | boolean | AppState | AppStateArray;
};

// Ideally this should be a `type` not an `interface` but self-referencial
// types is not supported: github.com/Microsoft/TypeScript/issues/6230
export interface AppStateArray
  extends Array<string | number | boolean | AppState | AppStateArray> {}

export type ProtocolMessage = {
  protocol: Protocol;
  multisigAddress: string;
  params: ProtocolParameters;
  fromAddress: string;
  toAddress: string;
  seq: number;
  signature?: Signature;
};

export type SetupParams = {};

export type UpdateParams = {
  appInstanceId: string;
  newState: AppState;
};

export type InstallParams = {
  aliceBalanceDecrement: BigNumber;
  bobBalanceDecrement: BigNumber;
  signingKeys: string[];
  initialState: AppState;
  terms: Terms;
  appInterface: AppInterface;
  defaultTimeout: number;
};

export type UninstallParams = {
  appInstanceId: string;
  aliceBalanceIncrement: BigNumber;
  bobBalanceIncrement: BigNumber;
};

export type InstallVirtualAppParams = {
  /* TODO: @xuanji */
};

type ProtocolParameters =
  | SetupParams
  | UpdateParams
  | InstallParams
  | UninstallParams
  | InstallVirtualAppParams;
