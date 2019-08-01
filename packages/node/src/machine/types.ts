import {
  AppInterface,
  NetworkContext,
  OutcomeType,
  SolidityValueType
} from "@counterfactual/types";
import { BaseProvider } from "ethers/providers";
import { BigNumber, Signature } from "ethers/utils";

import { Transaction } from "../ethereum/types";
import { StateChannel } from "../models";

import { Opcode, Protocol } from "./enums";

export type ProtocolExecutionFlow = {
  [x: number]: (context: Context) => AsyncIterableIterator<any[]>;
};

export type Middleware = {
  (args: any): any;
};

export type Instruction = Function | Opcode;

/// Arguments passed to a protocol execulion flow
export interface Context {
  network: NetworkContext;
  stateChannelsMap: Map<string, StateChannel>;
  message: ProtocolMessage;
  provider: BaseProvider;
}

export type ProtocolMessage = {
  protocolExecutionID: string;
  protocol: Protocol;
  params: ProtocolParameters;
  toXpub: string;
  seq: number;
  signature?: Signature;
  signature2?: Signature;
  signature3?: Signature;
  signature4?: Signature;
};

export type SetupParams = {
  initiatorXpub: string;
  responderXpub: string;
  multisigAddress: string;
};

export type UpdateParams = {
  initiatorXpub: string;
  responderXpub: string;
  multisigAddress: string;
  appIdentityHash: string;
  newState: SolidityValueType;
};

export type TakeActionParams = {
  initiatorXpub: string;
  responderXpub: string;
  multisigAddress: string;
  appIdentityHash: string;
  action: SolidityValueType;
};

export type WithdrawParams = {
  initiatorXpub: string;
  responderXpub: string;
  multisigAddress: string;
  recipient: string;
  amount: BigNumber;
  tokenAddress: string;
};

export type InstallParams = {
  initiatorXpub: string;
  initiatorDepositTokenAddress: string;
  responderXpub: string;
  responderDepositTokenAddress: string;
  multisigAddress: string;
  initiatorBalanceDecrement: BigNumber;
  responderBalanceDecrement: BigNumber;
  participants: string[];
  initialState: SolidityValueType;
  appInterface: AppInterface;
  defaultTimeout: number;

  // Outcome Type returned by the app instance, as defined by `appInterface`
  outcomeType: OutcomeType;
};

export type UninstallParams = {
  appIdentityHash: string;
  initiatorXpub: string;
  responderXpub: string;
  multisigAddress: string;
};

export type InstallVirtualAppParams = {
  initiatorXpub: string;
  responderXpub: string;
  intermediaryXpub: string;
  defaultTimeout: number;
  appInterface: AppInterface;
  initialState: SolidityValueType;

  // initiator and respondor must fund the installed virtual app with the same
  // token type `tokenAddress`, but may use different amounts
  initiatorBalanceDecrement: BigNumber;
  responderBalanceDecrement: BigNumber;
  tokenAddress: string;

  // outcomeType returned by the app instance, as defined by the app definition `appInterface`
  outcomeType: OutcomeType;
};

export type UninstallVirtualAppParams = {
  initiatorXpub: string;
  responderXpub: string;
  intermediaryXpub: string;
  targetAppIdentityHash: string;
  targetOutcome: string;
};

export type ProtocolParameters =
  | SetupParams
  | UpdateParams
  | InstallParams
  | UninstallParams
  | WithdrawParams
  | InstallVirtualAppParams
  | UninstallVirtualAppParams;

export { Transaction };
