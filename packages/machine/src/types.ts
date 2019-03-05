import {
  AppInterface,
  NetworkContext,
  SolidityABIEncoderV2Struct,
  Terms
} from "@counterfactual/types";
import { BigNumber, Signature } from "ethers/utils";

import { Opcode, Protocol } from "./enums";
import { Transaction } from "./ethereum/types";
import { EthereumCommitment } from "./ethereum/utils";
import { StateChannel } from "./models";

export type ProtocolExecutionFlow = {
  [x: number]: Instruction[];
};

export type Middleware = {
  (message: ProtocolMessage, next: Function, context: Context): void;
};

export type Instruction = Function | Opcode;

/// TODO(xuanji): the following fields are hacked in to make install-virtual-app work:
/// - commitments[], signatures[]: the intermediary needs to generate three signatures:
///   two sigs authorizing ETHVirtualAppAgreements, and one authorizing virtualAppSetState.
export interface Context {
  network: NetworkContext;
  outbox: ProtocolMessage[];
  inbox: ProtocolMessage[];
  stateChannelsMap: Map<string, StateChannel>;
  commitments: EthereumCommitment[];
  signatures: Signature[];
  appIdentityHash?: string;
  finalCommitment?: Transaction; // todo: is one enough?
}

export type ProtocolMessage = {
  protocol: Protocol;
  params: ProtocolParameters;
  fromXpub: string;
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
