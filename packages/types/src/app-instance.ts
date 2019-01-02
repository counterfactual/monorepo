import { BigNumber, bigNumberify } from "ethers/utils";

import { Address } from "./simple-types";

export enum AssetType {
  ETH = 0,
  ERC20 = 1
}

export interface Terms {
  assetType: AssetType;
  limit: BigNumber;
  token: Address;
}

export interface Transaction {
  assetType: AssetType;
  limit: BigNumber;
  token?: Address;
  to: Address[];
  value: BigNumber[];
  data: string[];
}

export interface AppIdentity {
  owner: string;
  signingKeys: string[];
  appInterfaceHash: string;
  termsHash: string;
  defaultTimeout: number;
}

export interface AppInterface {
  addr: string;
  applyAction: string;
  resolve: string;
  getTurnTaker: string;
  isStateTerminal: string;
  stateEncoding: string;
  actionEncoding: string | undefined;
}

export interface AppInstance {
  owner: string;
  signingKeys: string[];
  appInterface: AppInterface;
  terms: Terms;
  defaultTimeout: number;
}

export interface SignedStateHashUpdate {
  stateHash: string;
  nonce: number;
  timeout: number;
  signatures: string;
}

export type ETHBucketApp = {
  readonly alice: string;
  readonly bob: string;
  readonly aliceBalance: string | BigNumber;
  readonly bobBalance: string | BigNumber;
};

export class ETHBucketAppState {
  readonly alice: string;
  readonly bob: string;
  readonly aliceBalance: BigNumber;
  readonly bobBalance: BigNumber;
  constructor(ethBucketApp: ETHBucketApp) {
    this.alice = ethBucketApp.alice;
    this.bob = ethBucketApp.bob;
    this.aliceBalance = bigNumberify(ethBucketApp.aliceBalance);
    this.bobBalance = bigNumberify(ethBucketApp.bobBalance);
  }
}
