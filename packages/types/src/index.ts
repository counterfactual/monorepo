import {
  AppIdentity,
  AppInterface,
  ETHBucketAppState,
  SignedStateHashUpdate
} from "./app-instance";
import {
  AppABIEncodings,
  AppInstanceInfo,
  OutcomeType,
  TwoPartyFixedOutcome
} from "./data-types";
import { INodeProvider, IRpcNodeProvider, Node } from "./node";
import {
  ABIEncoding,
  Address,
  AppInstanceID,
  Bytes32,
  SolidityABIEncoderV2Type
} from "./simple-types";

export interface NetworkContext {
  DolphinCoin: string;
  ChallengeRegistry: string;
  ETHBalanceRefundApp: string;
  ETHBucket: string;
  ETHInterpreter: string;
  MinimumViableMultisig: string;
  MultiSend: string;
  ProxyFactory: string;
  RootNonceRegistry: string;
  StateChannelTransaction: string;
  TwoPartyEthAsLump: string;
  TwoPartyVirtualEthAsLump: string;
  UninstallKeyRegistry: string;
}

// Keep in sync with above
export const networkContextProps = [
  "ChallengeRegistry",
  "DolphinCoin",
  "ETHBalanceRefundApp",
  "ETHBucket",
  "ETHInterpreter",
  "MinimumViableMultisig",
  "MultiSend",
  "ProxyFactory",
  "RootNonceRegistry",
  "StateChannelTransaction",
  "TwoPartyEthAsLump",
  "TwoPartyVirtualEthAsLump",
  "UninstallKeyRegistry"
];

export interface ContractMigration {
  contractName: string;
  address: string;
  transactionHash: string;
}

export {
  ABIEncoding,
  Address,
  AppABIEncodings,
  AppIdentity,
  AppInstanceID,
  AppInstanceInfo,
  AppInterface,
  SolidityABIEncoderV2Type,
  Bytes32,
  ETHBucketAppState,
  INodeProvider,
  IRpcNodeProvider,
  Node,
  SignedStateHashUpdate,
  OutcomeType,
  TwoPartyFixedOutcome
};
