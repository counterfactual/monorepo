import {
  AppInterface,
  NetworkContext,
  OutcomeType,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { BaseProvider } from "ethers/providers";
import { BigNumber, Signature } from "ethers/utils";

import { Transaction } from "../ethereum/types";
import { AppInstance, StateChannel } from "../models";

import { Opcode, Protocol } from "./enums";

export type Middleware = {
  (args: any): any;
};

export type Instruction = Function | Opcode;

export type BaseProtocolContext = {
  network: NetworkContext;
  message: ProtocolMessage;
  provider: BaseProvider;
};

export type DirectChannelProtocolContext = BaseProtocolContext & {
  stateChannel: StateChannel;
};

export type VirtualChannelProtocolContext = BaseProtocolContext & {
  stateChannelWithIntermediary: StateChannel;
  stateChannelWithCounterparty: StateChannel;
};

export type VirtualChannelIntermediaryProtocolContext = BaseProtocolContext & {
  stateChannelWithInitiating: StateChannel;
  stateChannelWithResponding: StateChannel;
  // TODO: Remove the need for this field; should only be known by endpoints
  stateChannelWithCounterparty?: StateChannel;
};

export type AppInstanceProtocolContext = BaseProtocolContext & {
  appInstance: AppInstance;
};

export type ProtocolContext =
  | DirectChannelProtocolContext
  | VirtualChannelProtocolContext
  | VirtualChannelIntermediaryProtocolContext
  | AppInstanceProtocolContext;

export type DirectChannelProtocolExecutionFlow = {
  [x: number]: (
    context: DirectChannelProtocolContext
  ) => AsyncIterableIterator<any[]>;
};

export type VirtualChannelProtocolExecutionFlow = {
  0: (context: VirtualChannelProtocolContext) => AsyncIterableIterator<any[]>;
  1: (
    context: VirtualChannelIntermediaryProtocolContext
  ) => AsyncIterableIterator<any[]>;
  2: (context: VirtualChannelProtocolContext) => AsyncIterableIterator<any[]>;
};

export type AppInstanceProtocolExecutionFlow = {
  [x: number]: (
    context: AppInstanceProtocolContext
  ) => AsyncIterableIterator<any[]>;
};

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
  initiatingXpub: string;
  respondingXpub: string;
  multisigAddress: string;
};

export type UpdateParams = {
  initiatingXpub: string;
  respondingXpub: string;
  multisigAddress: string;
  appIdentityHash: string;
  newState: SolidityABIEncoderV2Type;
};

export type TakeActionParams = {
  initiatingXpub: string;
  respondingXpub: string;
  multisigAddress: string;
  appIdentityHash: string;
  action: SolidityABIEncoderV2Type;
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
  initiatingBalanceDecrement: BigNumber;
  respondingBalanceDecrement: BigNumber;
  signingKeys: string[];
  initialState: SolidityABIEncoderV2Type;
  appInterface: AppInterface;
  defaultTimeout: number;
  outcomeType: OutcomeType;
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
  initialState: SolidityABIEncoderV2Type;
  initiatingBalanceDecrement: BigNumber;
  respondingBalanceDecrement: BigNumber;
};

export type UninstallVirtualAppParams = {
  initiatingXpub: string;
  respondingXpub: string;
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
