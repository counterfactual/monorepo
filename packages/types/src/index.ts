import {
  AppIdentity,
  AppInterface,
  ETHBucketAppState,
  SignedStateHashUpdate
} from "./app-instance";
import {
  AppABIEncodings,
  AppInstanceInfo,
  erc20BalanceRefundStateEncoding,
  ethBalanceRefundStateEncoding,
  OutcomeType,
  TwoPartyFixedOutcome
} from "./data-types";
import { INodeProvider, Node } from "./node";
import {
  ABIEncoding,
  Address,
  AppInstanceID,
  Bytes32,
  ContractABI,
  SolidityABIEncoderV2Type
} from "./simple-types";

export interface NetworkContext {
  DolphinCoin: string;
  ChallengeRegistry: string;
  ETHBalanceRefundApp: string;
  ETHBucket: string;
  ETHInterpreter: string;
  ERC20BalanceRefundApp: string;
  ERC20Bucket: string;
  ERC20TwoPartyDynamicInterpreter: string;
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
  "ERC20BalanceRefundApp",
  "ERC20Bucket",
  "ERC20TwoPartyDynamicInterpreter",
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
  ContractABI,
  erc20BalanceRefundStateEncoding,
  ethBalanceRefundStateEncoding,
  SolidityABIEncoderV2Type,
  Bytes32,
  ETHBucketAppState,
  INodeProvider,
  Node,
  SignedStateHashUpdate,
  OutcomeType,
  TwoPartyFixedOutcome
};
