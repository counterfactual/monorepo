import {
  AppIdentity,
  AppInterface,
  SignedStateHashUpdate
} from "./app-instance";
import {
  AppABIEncodings,
  AppInstanceInfo,
  coinBalanceRefundStateEncoding,
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
  ContractABI,
  SolidityABIEncoderV2Type
} from "./simple-types";

export interface NetworkContext {
  ChallengeRegistry: string;
  CoinBalanceRefundApp: string;
  CoinBucket: string;
  CoinInterpreter: string;
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
  "CoinBalanceRefundApp",
  "CoinBucket",
  "CoinInterpreter",
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
  ContractABI,
  coinBalanceRefundStateEncoding,
  INodeProvider,
  IRpcNodeProvider,
  Node,
  OutcomeType,
  SignedStateHashUpdate,
  TwoPartyFixedOutcome,
  TwoPartyFixedOutcomeInterpreterParams
};
