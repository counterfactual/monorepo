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
  Bytes32,
  ContractABI,
  SolidityABIEncoderV2Type
} from "./simple-types";

export interface NetworkContext {
  ChallengeRegistry: string;
  ConditionalTransactionDelegateTarget: string;
  CoinBalanceRefundApp: string;
  CoinTransferETHInterpreter: string;
  FreeBalanceApp: string;
  IdentityApp: string;
  MinimumViableMultisig: string;
  ProxyFactory: string;
  TwoPartyFixedOutcomeETHInterpreter: string;
  TwoPartyFixedOutcomeFromVirtualAppETHInterpreter: string;
}

// Keep in sync with above
export const networkContextProps = [
  "ChallengeRegistry",
  "ConditionalTransactionDelegateTarget",
  "CoinBalanceRefundApp",
  "CoinTransferETHInterpreter",
  "IdentityApp",
  "FreeBalanceApp",
  "MinimumViableMultisig",
  "ProxyFactory",
  "TwoPartyFixedOutcomeETHInterpreter",
  "TwoPartyFixedOutcomeFromVirtualAppETHInterpreter"
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
  AppInstanceInfo,
  AppInterface,
  coinBalanceRefundStateEncoding,
  CoinTransferInterpreterParams,
  ContractABI,
  SolidityABIEncoderV2Type,
  Bytes32,
  INodeProvider,
  IRpcNodeProvider,
  Node,
  SignedStateHashUpdate,
  OutcomeType,
  TwoPartyFixedOutcome,
  TwoPartyFixedOutcomeInterpreterParams
};
