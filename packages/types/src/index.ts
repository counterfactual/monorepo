import {
  AppIdentity,
  AppInterface,
  AssetType,
  ETHBucketAppState,
  SignedStateHashUpdate
} from "./app-instance";
import {
  AppABIEncodings,
  AppInstanceInfo,
  BlockchainAsset,
  ResolutionType,
  TwoPartyOutcome
} from "./data-types";
import { INodeProvider, Node } from "./node-protocol";
import {
  ABIEncoding,
  Address,
  AppInstanceID,
  Bytes32,
  SolidityABIEncoderV2Type
} from "./simple-types";

export interface NetworkContext {
  AppRegistry: string;
  ETHBalanceRefundApp: string;
  ETHBucket: string;
  MultiSend: string;
  NonceRegistry: string;
  StateChannelTransaction: string;
  TwoPartyVirtualEthAsLump: string;
  MinimumViableMultisig: string;
  ProxyFactory: string;
  ETHInterpreter: string;
  TwoPartyEthAsLump: string;
}

// Keep in sync with above
export const networkContextProps = [
  "AppRegistry",
  "ETHBalanceRefundApp",
  "ETHBucket",
  "MultiSend",
  "NonceRegistry",
  "StateChannelTransaction",
  "TwoPartyVirtualEthAsLump",
  "MinimumViableMultisig",
  "ProxyFactory",
  "ETHInterpreter",
  "TwoPartyEthAsLump"
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
  AssetType,
  BlockchainAsset,
  Bytes32,
  ETHBucketAppState,
  INodeProvider,
  Node,
  SignedStateHashUpdate,
  ResolutionType,
  TwoPartyOutcome
};
