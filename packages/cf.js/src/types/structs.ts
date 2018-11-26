import { ABIEncoding, Address } from "./simple-types";
import { BigNumber } from "ethers/utils";

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
  stateEncoding: string;
  actionEncoding?: string;
}

export interface BlockchainAsset {
  assetType: number;
  token?: string;
}