import { BigNumber } from "ethers/utils";

export enum AssetType {
  ETH = 0,
  ERC20 = 1
}

export type AppIdentity = {
  owner: string;
  signingKeys: string[];
  appDefinitionAddress: string;
  interpreterHash: string;
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

export type ETHBucketParties = Map<string, BigNumber>;

export type ETHBucketParty = {
  amount: { _hex: string };
  to: string;
};

export type ETHBucketAppState = ETHBucketParty[];
