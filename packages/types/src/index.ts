import {
  AppIdentity,
  AppInterface,
  AssetType,
  ETHBucketAppState,
  SignedStateHashUpdate,
  Terms,
  Transaction
} from "./app-instance";
import {
  AppABIEncodings,
  AppInstanceInfo,
  BlockchainAsset
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
  ETHVirtualAppAgreement: string;
  MinimumViableMultisig: string;
  ProxyFactory: string;
}

// Keep in sync with above
export const networkContextProps = [
  "AppRegistry",
  "ETHBalanceRefundApp",
  "ETHBucket",
  "MultiSend",
  "NonceRegistry",
  "StateChannelTransaction",
  "ETHVirtualAppAgreement",
  "MinimumViableMultisig",
  "ProxyFactory"
];

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
  Terms,
  Transaction
};
