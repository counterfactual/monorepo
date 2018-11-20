import { BigNumberish } from "ethers/utils";

import { ABIEncoding, Address } from "./simple-types";

export enum BlockchainAssetType {
  ETH = 0,
  ERC20 = 1,
  OTHER = 2
}

export interface BlockchainAsset {
  assetType: BlockchainAssetType;
  token?: Address;
}

export interface AppDefinition {
  address: Address;
  appStateEncoding: ABIEncoding;
  appActionEncoding: ABIEncoding;
}

export interface AppInstallProposal {
  // TODO: somehow identify involved parties
  appDefinition: AppDefinition;
  asset: BlockchainAsset;
  deposits: { [addr: string]: BigNumberish };
  initialState: any;
}
