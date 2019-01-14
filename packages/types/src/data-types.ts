// https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#data-types
import { BigNumber } from "ethers/utils";

import { AssetType } from "./app-instance";
import { ABIEncoding, Address, AppInstanceID } from "./simple-types";

export type AppInstanceInfo = {
  id: AppInstanceID;
  appId: Address;
  abiEncodings: AppABIEncodings;
  asset: BlockchainAsset;
  myDeposit: BigNumber;
  peerDeposit: BigNumber;
  timeout: BigNumber;
  initiatingAddress: Address;
  respondingAddress: Address;
  intermediaries?: Address[];
};

export type AppABIEncodings = {
  stateEncoding: ABIEncoding;
  actionEncoding?: ABIEncoding;
};

export type BlockchainAsset = {
  assetType: AssetType;
  token?: Address;
};
