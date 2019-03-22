import { BigNumber } from "ethers/utils";

import { Address } from "./simple-types";

export enum AssetType {
  ETH = 0,
  ERC20 = 1
}

export type Terms = {
  assetType: AssetType;
  limit: BigNumber;
  token: Address;
};

export type Transaction = {
  assetType: AssetType;
  limit: BigNumber;
  token?: Address;
  to: Address[];
  value: BigNumber[];
  data: string[];
};

export type AppIdentity = {
  owner: string;
  signingKeys: string[];
  appDefinitionAddress: string;
  termsHash: string;
  defaultTimeout: number;
};

export type AppInterface = {
  addr: string;
  stateEncoding: string;
  actionEncoding: string | undefined;
};

export type SignedStateHashUpdate = {
  appStateHash: string;
  nonce: number;
  timeout: number;
  signatures: string;
};

export type ETHBucketAppState = {
  alice: string;
  bob: string;
  aliceBalance: BigNumber;
  bobBalance: BigNumber;
};
