// https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#data-types
import { BigNumber } from "ethers/utils";

import { ABIEncoding, Address } from "./simple-types";

export interface AppDefinition {
  address: Address;
  appStateEncoding: ABIEncoding;
  appActionEncoding: ABIEncoding;
}

export interface AppInstanceInfo {
  id: string;
  appId: string;
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

enum AssetType {
  ETH = 0,
  ERC20 = 1,
  Other = 2
}

export interface BlockchainAsset {
  assetType: AssetType;
  token?: Address;
}
