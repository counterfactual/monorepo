import {
  AppInterface,
  NetworkContext,
  OutcomeType,
  SolidityABIEncoderV2Type
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
  newState: SolidityABIEncoderV2Type;
};

export type TakeActionParams = {
  initiatorXpub: string;
  responderXpub: string;
  multisigAddress: string;
  appIdentityHash: string;
  action: SolidityABIEncoderV2Type;
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
  responderXpub: string;
  tokenAddress: string;
  multisigAddress: string;
  initiatorBalanceDecrement: BigNumber;
  responderBalanceDecrement: BigNumber;
  signingKeys: string[];
  initialState: SolidityABIEncoderV2Type;
  appInterface: AppInterface;
  defaultTimeout: number;
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
  initialState: SolidityABIEncoderV2Type;
  initiatorBalanceDecrement: BigNumber;
  responderBalanceDecrement: BigNumber;
  tokenAddress: string;
};

export type UninstallVirtualAppParams = {
  initiatorXpub: string;
  responderXpub: string;
  intermediaryXpub: string;
  targetAppIdentityHash: string;
  targetAppState: SolidityABIEncoderV2Type;
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
