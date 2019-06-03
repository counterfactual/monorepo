// https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#data-types
import { BigNumber } from "ethers/utils";

import { ABIEncoding, AppInstanceID } from "./simple-types";

export type AppInstanceInfo = {
  id: AppInstanceID;
  appId: string;
  abiEncodings: AppABIEncodings;
  myDeposit: BigNumber;
  peerDeposit: BigNumber;
  timeout: BigNumber;
  proposedByIdentifier: string; // xpub
  proposedToIdentifier: string; // xpub
  intermediaries?: string[];
};

export type AppABIEncodings = {
  stateEncoding: ABIEncoding;
  actionEncoding: ABIEncoding | undefined;
};

// Interpreter.sol::OutcomeType
export enum OutcomeType {
  TWO_PARTY_FIXED_OUTCOME = 0,
  ETH_TRANSFER = 1
}

// TwoPartyFixedOutcome.sol::Outcome
export enum TwoPartyFixedOutcome {
  SEND_TO_ADDR_ONE = 0,
  SEND_TO_ADDR_TWO = 1,
  SPLIT_AND_SEND_TO_BOTH_ADDRS = 2
}
