// https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#data-types
import { BigNumber } from "ethers/utils";

import { ABIEncoding, Address, AppInstanceID } from "./simple-types";

export interface AppInstanceInfo {
  id: AppInstanceID;
  appId: Address;
  abiEncodings: AppABIEncodings;
  asset: BlockchainAsset;
  myDeposit: BigNumber;
  peerDeposit: BigNumber;
  timeout: BigNumber;
}

export interface AppABIEncodings {
  stateEncoding: ABIEncoding;
  actionEncoding?: ABIEncoding;
}

export enum AssetType {
  ETH = 0,
  ERC20 = 1,
  Other = 2
}

export interface BlockchainAsset {
  assetType: AssetType;
  token?: Address;
}
