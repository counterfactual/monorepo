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
  AppAction,
  AppInstanceID,
  Bytes32,
  SolidityABIEncoderV2Struct
} from "./simple-types";

export interface NetworkContext {
  AppRegistry: string;
  ETHBalanceRefund: string;
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
  AppAction,
  AppIdentity,
  AppInstanceID,
  AppInstanceInfo,
  AppInterface,
  SolidityABIEncoderV2Struct,
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
