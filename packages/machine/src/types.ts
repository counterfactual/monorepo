import { AppInterface, NetworkContext, Terms } from "@counterfactual/types";
import { BigNumber, BigNumberish, Signature } from "ethers/utils";

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
/// - commitment2, signature2: the intermediary needs to generate three signatures:
///   two sigs authorizing ETHVirtualAppAgreements, and one authorizing virtualAppSetState.
/// - targetVirtualAppInstance: this is a state modification that should be returned to called, but the current
///   mechanism for returning stuff like this is to modify the `statechannel` parameter. But this parameter
///   is already used for the ledger channel (we write the ETHVirtualAppAgreement instance into it).
export interface Context {
  network: NetworkContext;
  outbox: ProtocolMessage[];
  inbox: ProtocolMessage[];
  stateChannelsMap: Map<string, StateChannel>;
  commitments: EthereumCommitment[];
  signatures: Signature[];
  appIdentityHash?: string;
}

// The application-specific state of an app instance, to be interpreted by the
// app developer. We just treat it as an opaque blob; however since we pass this
// around in protocol messages and include this in transaction data in disputes,
// we impose some restrictions on the type; they must be serializable both as
// JSON and as solidity structs.
export type SolidityABIEncoderV2Struct = {
  [x: string]:
    | string
    | BigNumberish
    | boolean
    | SolidityABIEncoderV2Struct
    | SolidityABIEncoderV2StructArray;
};

// Ideally this should be a `type` not an `interface` but self-referencial
// types is not supported: github.com/Microsoft/TypeScript/issues/6230
export interface SolidityABIEncoderV2StructArray
  extends Array<
    | string
    | number
    | boolean
    | SolidityABIEncoderV2Struct
    | SolidityABIEncoderV2StructArray
  > {}

export type ProtocolMessage = {
  protocol: Protocol;
  params: ProtocolParameters;
  fromAddress: string;
  toAddress: string;
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
  aliceBalanceIncrement: BigNumber;
  bobBalanceIncrement: BigNumber;
};

export type InstallVirtualAppParams = {
  initiatingXpub: string;
  respondingXpub: string;
  intermediaryXpub: string;
  signingKeys: string[];
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
  initiatingBalanceIncrement: BigNumber;
  respondingBalanceIncrement: BigNumber;
};

export type ProtocolParameters =
  | SetupParams
  | UpdateParams
  | InstallParams
  | UninstallParams
  | InstallVirtualAppParams
  | UninstallVirtualAppParams;

export { Transaction };
