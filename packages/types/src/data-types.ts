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
  proposedByIdentifier: string; // xpub
  proposedToIdentifier: string; // xpub
  intermediaries?: Address[];
};

export type AppABIEncodings = {
  stateEncoding: ABIEncoding;
  actionEncoding: ABIEncoding | undefined;
};

export type BlockchainAsset = {
  assetType: AssetType;
  token?: Address;
};

// Interpreter.sol::ResolutionType
export enum ResolutionType {
  TWO_PARTY_OUTCOME = 0,
  ETH_TRANSFER = 1
}

// TwoPartyOutcome.sol::Resolution
export enum TwoPartyOutcome {
  SEND_TO_ADDR_ONE = 0,
  SEND_TO_ADDR_TWO = 1,
  SPLIT_AND_SEND_TO_BOTH_ADDRS = 2
}