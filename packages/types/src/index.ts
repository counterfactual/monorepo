import {
  AppIdentity,
  AppInterface,
  AssetType,
  ETHBucketAppState,
  FreeBalanceAppState,
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
  SolidityABIEncoderV2Struct
} from "./simple-types";

export interface NetworkContext {
  AppRegistry: string;
  ETHBalanceRefund: string;
  FreeBalanceAppState: string;
  ETHBucket: string;
  MultiSend: string;
  NonceRegistry: string;
  StateChannelTransaction: string;
  ETHVirtualAppAgreement: string;
  MinimumViableMultisig: string;
  ProxyFactory: string;
}

export {
  ABIEncoding,
  Address,
  AppABIEncodings,
  AppIdentity,
  AppInstanceID,
  AppInstanceInfo,
  AppInterface,
  SolidityABIEncoderV2Struct,
  AssetType,
  BlockchainAsset,
  Bytes32,
  ETHBucketAppState,
  FreeBalanceAppState,
  INodeProvider,
  Node,
  SignedStateHashUpdate,
  Terms,
  Transaction
};
