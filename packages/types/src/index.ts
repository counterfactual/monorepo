import {
  AppIdentity,
  AppInterface,
  ETHBucketAppState,
  SignedStateHashUpdate
} from "./app-instance";
import {
  AppABIEncodings,
  AppInstanceInfo,
  CoinTransferInterpreterParams,
  OutcomeType,
  TwoPartyFixedOutcome,
  TwoPartyFixedOutcomeInterpreterParams
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
  ChallengeRegistry: string;
  ETHBalanceRefundApp: string;
  ETHBucket: string;
  ETHInterpreter: string;
  MinimumViableMultisig: string;
  MultiSend: string;
  ProxyFactory: string;
  ConditionalTransactionDelegateTarget: string;
  TwoPartyEthAsLump: string;
  TwoPartyVirtualEthAsLump: string;
  UninstallKeyRegistry: string;
}

// Keep in sync with above
export const networkContextProps = [
  "ChallengeRegistry",
  "ETHBalanceRefundApp",
  "ETHBucket",
  "ETHInterpreter",
  "MinimumViableMultisig",
  "MultiSend",
  "ProxyFactory",
  "ConditionalTransactionDelegateTarget",
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
  CoinTransferInterpreterParams,
  SolidityABIEncoderV2Type,
  Bytes32,
  ETHBucketAppState,
  INodeProvider,
  IRpcNodeProvider,
  Node,
  SignedStateHashUpdate,
  OutcomeType,
  TwoPartyFixedOutcome,
  TwoPartyFixedOutcomeInterpreterParams
};
