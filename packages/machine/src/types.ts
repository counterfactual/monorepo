import {
  AppInterface,
  NetworkContext,
  SolidityABIEncoderV2Struct,
  Terms
} from "@counterfactual/types";
import { BaseProvider } from "ethers/providers";
import { BigNumber, Signature } from "ethers/utils";

import { Opcode, Protocol } from "./enums";
import { Transaction } from "./ethereum/types";
import { StateChannel } from "./models";

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
  protocol: Protocol;
  params: ProtocolParameters;
  toXpub: string;
  seq: number;
  signature?: Signature;
  signature2?: Signature;
  signature3?: Signature;
};

export type SetupParams = {
  initiatingXpub: string;
  respondingXpub: string;
  multisigAddress: string;
};

export type UpdateParams = {
  initiatingXpub: string;
  respondingXpub: string;
  multisigAddress: string;
  appIdentityHash: string;
  newState: SolidityABIEncoderV2Struct;
};

export type TakeActionParams = {
  initiatingXpub: string;
  respondingXpub: string;
  multisigAddress: string;
  appIdentityHash: string;
  action: SolidityABIEncoderV2Struct;
};

export type WithdrawParams = {
  initiatingXpub: string;
  respondingXpub: string;
  multisigAddress: string;
  recipient: string;
  amount: BigNumber;
};

export type InstallParams = {
  initiatingXpub: string;
  respondingXpub: string;
  multisigAddress: string;
  aliceBalanceDecrement: BigNumber;
  bobBalanceDecrement: BigNumber;
  signingKeys: string[];
  initialState: SolidityABIEncoderV2Struct;
  terms: Terms;
  appInterface: AppInterface;
  defaultTimeout: number;
};

export type UninstallParams = {
  appIdentityHash: string;
  initiatingXpub: string;
  respondingXpub: string;
  multisigAddress: string;
};

export type InstallVirtualAppParams = {
  initiatingXpub: string;
  respondingXpub: string;
  intermediaryXpub: string;
  defaultTimeout: number;
  appInterface: AppInterface;
  initialState: SolidityABIEncoderV2Struct;
  initiatingBalanceDecrement: BigNumber;
  respondingBalanceDecrement: BigNumber;
};

export type UninstallVirtualAppParams = {
  initiatingXpub: string;
  respondingXpub: string;
  intermediaryXpub: string;
  targetAppIdentityHash: string;
  targetAppState: SolidityABIEncoderV2Struct;
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
