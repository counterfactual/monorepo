import {
  AppIdentity,
  AppInterface,
  SignedStateHashUpdate
} from "./app-instance";
import {
  AppABIEncodings,
  AppInstanceInfo,
  AppInstanceJson,
  AppInstanceProposal,
  CoinBalanceRefundState,
  coinBalanceRefundStateEncoding,
  MultiAssetMultiPartyCoinTransferInterpreterParams,
  multiAssetMultiPartyCoinTransferInterpreterParamsEncoding,
  OutcomeType,
  SingleAssetTwoPartyCoinTransferInterpreterParams,
  singleAssetTwoPartyCoinTransferInterpreterParamsEncoding,
  TwoPartyFixedOutcome,
  TwoPartyFixedOutcomeInterpreterParams
} from "./data-types";
import { INodeProvider, IRpcNodeProvider, Node } from "./node";
import {
  ABIEncoding,
  Address,
  ContractABI,
  SolidityABIEncoderV2Type
} from "./simple-types";

export interface NetworkContext {
  ChallengeRegistry: string;
  ConditionalTransactionDelegateTarget: string;
  CoinBalanceRefundApp: string;
  CoinTransferInterpreter: string;
  FreeBalanceApp: string;
  IdentityApp: string;
  MinimumViableMultisig: string;
  ProxyFactory: string;
  SingleAssetTwoPartyCoinTransferInterpreter: string;
  TimeLockedPassThrough: string;
  TwoPartyFixedOutcomeInterpreter: string;
  TwoPartyFixedOutcomeFromVirtualAppInterpreter: string;
}

// Keep in sync with above
export const EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT = [
  "ChallengeRegistry",
  "ConditionalTransactionDelegateTarget",
  "CoinBalanceRefundApp",
  "CoinTransferInterpreter",
  "IdentityApp",
  "FreeBalanceApp",
  "MinimumViableMultisig",
  "ProxyFactory",
  "SingleAssetTwoPartyCoinTransferInterpreter",
  "TimeLockedPassThrough",
  "TwoPartyFixedOutcomeInterpreter",
  "TwoPartyFixedOutcomeFromVirtualAppInterpreter"
];

export interface DeployedContractNetworksFileEntry {
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
  AppInstanceProposal,
  AppInstanceJson,
  AppInterface,
  CoinBalanceRefundState,
  coinBalanceRefundStateEncoding,
  MultiAssetMultiPartyCoinTransferInterpreterParams,
  multiAssetMultiPartyCoinTransferInterpreterParamsEncoding,
  singleAssetTwoPartyCoinTransferInterpreterParamsEncoding,
  ContractABI,
  SolidityABIEncoderV2Type,
  INodeProvider,
  IRpcNodeProvider,
  Node,
  SignedStateHashUpdate,
  OutcomeType,
  SingleAssetTwoPartyCoinTransferInterpreterParams,
  TwoPartyFixedOutcome,
  TwoPartyFixedOutcomeInterpreterParams
};
