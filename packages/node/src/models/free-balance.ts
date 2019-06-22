import { OutcomeType } from "@counterfactual/types";
import { AddressZero, MaxUint256, Zero } from "ethers/constants";
import { BigNumber } from "ethers/utils";

import {
  decodeCoinBucketBalances,
  getCoinBucketAppInterface
} from "../ethereum/utils/funds-bucket";
import { xkeysToSortedKthAddresses } from "../machine";

import { AppInstance } from ".";
import { HARD_CODED_ASSUMPTIONS } from "./state-channel";

export interface CoinBucketBalances {
  [address: string]: BigNumber;
}

export interface FreeBalanceState {
  [tokenAddress: string]: CoinBucketBalances;
}

export const ETH_FREE_BALANCE_ADDRESS = AddressZero;

export function getETHFreeBalance(fb: AppInstance) {
  return decodeCoinBucketBalances(
    fb.state[ETH_FREE_BALANCE_ADDRESS]
  ) as CoinBucketBalances;
}

export function createFreeBalance(
  multisigAddress: string,
  userNeuteredExtendedKeys: string[],
  coinBucketAddress: string,
  freeBalanceTimeout: number,
  tokenAddress?: string
) {
  const sortedTopLevelKeys = xkeysToSortedKthAddresses(
    userNeuteredExtendedKeys,
    0 // NOTE: We re-use 0 which is also used as the keys for `multisigOwners`
  );

  // Making these values constants to be extremely explicit about
  // the built-in assumption here.
  const beneficiaryForPerson1 = sortedTopLevelKeys[0];
  const beneficiaryForPerson2 = sortedTopLevelKeys[1];
  const outcomeType = OutcomeType.COIN_TRANSFER;

  const state: FreeBalanceState = {};
  state[ETH_FREE_BALANCE_ADDRESS] = {};
  state[ETH_FREE_BALANCE_ADDRESS][beneficiaryForPerson1] = Zero;
  state[ETH_FREE_BALANCE_ADDRESS][beneficiaryForPerson2] = Zero;

  return new AppInstance(
    multisigAddress,
    sortedTopLevelKeys,
    freeBalanceTimeout,
    getCoinBucketAppInterface(coinBucketAddress),
    false,
    HARD_CODED_ASSUMPTIONS.appSequenceNumberForFreeBalance,
    HARD_CODED_ASSUMPTIONS.rootNonceValueAtFreeBalanceInstall,
    state,
    0,
    HARD_CODED_ASSUMPTIONS.freeBalanceInitialStateTimeout,
    outcomeType,
    undefined,
    // FIXME: refactor how the interpreter parameters get plumbed through
    tokenAddress ? undefined : { limit: MaxUint256 },
    tokenAddress ? { limit: MaxUint256, token: tokenAddress } : undefined
  );
}
