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
  multiAssetMultiPartyCoinTransferEncoding,
  MultiAssetMultiPartyCoinTransferInterpreterParams,
  multiAssetMultiPartyCoinTransferInterpreterParamsEncoding,
  OutcomeType,
  SingleAssetTwoPartyCoinTransferInterpreterParams,
  singleAssetTwoPartyCoinTransferInterpreterParamsEncoding,
  TwoPartyFixedOutcome,
  TwoPartyFixedOutcomeInterpreterParams,
  twoPartyFixedOutcomeInterpreterParamsEncoding,
  virtualAppAgreementEncoding
} from "./data-types";
import { IRpcNodeProvider, Node } from "./node";
import {
  ABIEncoding,
  Address,
  ContractABI,
  SolidityValueType
} from "./simple-types";

export interface NetworkContext {
  ChallengeRegistry: string;
  CoinBalanceRefundApp: string;
  ConditionalTransactionDelegateTarget: string;
  IdentityApp: string;
  MinimumViableMultisig: string;
  MultiAssetMultiPartyCoinTransferInterpreter: string;
  ProxyFactory: string;
  SingleAssetTwoPartyCoinTransferInterpreter: string;
  TimeLockedPassThrough: string;
  TwoPartyFixedOutcomeFromVirtualAppInterpreter: string;
  TwoPartyFixedOutcomeInterpreter: string;
}

// Keep in sync with above
export const EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT = [
  "ChallengeRegistry",
  "ConditionalTransactionDelegateTarget",
  "CoinBalanceRefundApp",
  "MultiAssetMultiPartyCoinTransferInterpreter",
  "IdentityApp",
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
  multiAssetMultiPartyCoinTransferEncoding,
  MultiAssetMultiPartyCoinTransferInterpreterParams,
  multiAssetMultiPartyCoinTransferInterpreterParamsEncoding,
  singleAssetTwoPartyCoinTransferInterpreterParamsEncoding,
  ContractABI,
  SolidityValueType,
  IRpcNodeProvider,
  Node,
  SignedStateHashUpdate,
  OutcomeType,
  SingleAssetTwoPartyCoinTransferInterpreterParams,
  twoPartyFixedOutcomeInterpreterParamsEncoding,
  TwoPartyFixedOutcome,
  TwoPartyFixedOutcomeInterpreterParams,
  virtualAppAgreementEncoding
};
