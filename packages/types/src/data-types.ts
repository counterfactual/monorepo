// https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#data-types
import { BigNumber } from "ethers/utils";

import { ABIEncoding, AppInstanceID } from "./simple-types";

export type TwoPartyOutcomeInterpreterParams = {
  // Derived from:
  // packages/contracts/contracts/interpreters/TwoPartyEthAsLump.sol#L10
  playerAddrs: [string, string];
  amount: BigNumber;
};

export type ETHTransferInterpreterParams = {
  // Derived from:
  // packages/contracts/contracts/interpreters/ETHInterpreter.sol#L18
  limit: BigNumber;
};

export type AppInstanceInfo = {
  id: AppInstanceID;
  appDefinition: string;
  abiEncodings: AppABIEncodings;
  myDeposit: BigNumber;
  peerDeposit: BigNumber;
  timeout: BigNumber;
  proposedByIdentifier: string; // xpub
  proposedToIdentifier: string; // xpub
  intermediaries?: string[];

  /**
   * Interpreter-related Fields
   */
  twoPartyOutcomeInterpreterParams?: TwoPartyOutcomeInterpreterParams;
  ethTransferInterpreterParams?: ETHTransferInterpreterParams;
};

export type AppABIEncodings = {
  stateEncoding: ABIEncoding;
  actionEncoding: ABIEncoding | undefined;
};

// Interpreter.sol::OutcomeType
export enum OutcomeType {
  TWO_PARTY_OUTCOME = 0,
  ETH_TRANSFER = 1
}

// TwoPartyOutcome.sol::Outcome
export enum TwoPartyOutcome {
  SEND_TO_ADDR_ONE = 0,
  SEND_TO_ADDR_TWO = 1,
  SPLIT_AND_SEND_TO_BOTH_ADDRS = 2
}
