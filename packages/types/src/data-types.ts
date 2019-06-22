// https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#data-types
import { BigNumber } from "ethers/utils";

import { ABIEncoding, AppInstanceID } from "./simple-types";

export type TwoPartyFixedOutcomeInterpreterParams = {
  // Derived from:
  // packages/contracts/contracts/interpreters/TwoPartyEthAsLump.sol#L10
  playerAddrs: [string, string];
  amount: BigNumber;
};

export type CoinTransferInterpreterParams = {
  // Derived from:
  // packages/contracts/contracts/interpreters/ETHInterpreter.sol#L18
  limit: BigNumber;
};

export type ERC20TwoPartyDynamicInterpreterParams = {
  // Derived from:
  // packages/contracts/contracts/interpreters/ERC20TwoPartyDynamicInterpreter.sol#L20
  limit: BigNumber;
  token: string;
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
  twoPartyOutcomeInterpreterParams?: TwoPartyFixedOutcomeInterpreterParams;
  coinTransferInterpreterParams?: CoinTransferInterpreterParams;
  erc20TwoPartyDynamicInterpreterParams?: ERC20TwoPartyDynamicInterpreterParams;
};

export type AppABIEncodings = {
  stateEncoding: ABIEncoding;
  actionEncoding: ABIEncoding | undefined;
};

// Interpreter.sol::OutcomeType
export enum OutcomeType {
  TWO_PARTY_FIXED_OUTCOME = 0,
  COIN_TRANSFER = 1
}

// TwoPartyFixedOutcome.sol::Outcome
export enum TwoPartyFixedOutcome {
  SEND_TO_ADDR_ONE = 0,
  SEND_TO_ADDR_TWO = 1,
  SPLIT_AND_SEND_TO_BOTH_ADDRS = 2
}

export const ethBalanceRefundStateEncoding =
  "tuple(address recipient, address multisig, uint256 threshold)";

export const erc20BalanceRefundStateEncoding =
  "tuple(address recipient, address multisig, uint256 threshold, address token)";
