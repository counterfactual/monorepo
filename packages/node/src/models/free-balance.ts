import { OutcomeType } from "@counterfactual/types";
import { AddressZero, MaxUint256, Zero } from "ethers/constants";
import { BigNumber, bigNumberify } from "ethers/utils";

import { getCoinBucketAppInterface } from "../ethereum/utils/funds-bucket";
import { xkeysToSortedKthAddresses } from "../machine";

import { AppInstance } from ".";
import { HARD_CODED_ASSUMPTIONS } from "./state-channel";

export interface CoinBucketBalanceMap {
  [to: string]: BigNumber;
}

export interface CoinBucketBalance {
  to: string;
  amount: BigNumber;
}

interface PlainCoinBucketBalance {
  to: string;
  amount: {
    _hex: string;
  };
}

export interface FreeBalanceState {
  [tokenAddress: string]: CoinBucketBalance[];
}

export interface PlainFreeBalanceState {
  tokens: string[];
  balances: PlainCoinBucketBalance[][];
}

export function convertCoinBucketToMap(
  coinBucketBalance: CoinBucketBalance[]
): CoinBucketBalanceMap {
  const balances = {};
  for (const balance of coinBucketBalance) {
    balances[balance.to] = balance.amount;
  }
  return balances;
}

export function convertCoinBucketFromMap(
  coinBucketBalanceMap: CoinBucketBalanceMap
): CoinBucketBalance[] {
  const balances: CoinBucketBalance[] = [];
  for (const addr of Object.keys(coinBucketBalanceMap)) {
    balances.push({
      to: addr,
      amount: coinBucketBalanceMap[addr]
    });
  }
  return balances;
}

export function convertFreeBalanceStateFromPlainObject(
  plainFreeBalanceState: PlainFreeBalanceState
): FreeBalanceState {
  const state: FreeBalanceState = {};
  for (
    let tokenIndex = 0;
    tokenIndex < plainFreeBalanceState.tokens.length;
    tokenIndex += 1
  ) {
    const tokenAddress = plainFreeBalanceState.tokens[tokenIndex];
    const balances = plainFreeBalanceState.balances[tokenIndex].map(
      plainCoinBucket => {
        return {
          to: plainCoinBucket.to,
          amount: bigNumberify(plainCoinBucket.amount._hex)
        };
      }
    );
    state[tokenAddress] = balances;
  }

  return state;
}

export function convertFreeBalanceStateToPlainObject(
  freeBalanceState: FreeBalanceState
): PlainFreeBalanceState {
  const state: PlainFreeBalanceState = {
    tokens: [],
    balances: []
  };

  for (const tokenAddress of Object.keys(freeBalanceState)) {
    state["tokens"].push(tokenAddress);
    const balances = freeBalanceState[tokenAddress].map(coinBucket => {
      return {
        to: coinBucket.to,
        amount: {
          _hex: coinBucket.amount.toHexString()
        }
      };
    });
    state["balances"].push(balances);
  }
  return state;
}

export function getETHFreeBalance(fb: AppInstance) {
  return convertCoinBucketToMap(
    convertFreeBalanceStateFromPlainObject(
      (fb.state as unknown) as PlainFreeBalanceState
    )[AddressZero]
  );
}

export function createFreeBalance(
  multisigAddress: string,
  userNeuteredExtendedKeys: string[],
  coinBucketAddress: string,
  freeBalanceTimeout: number
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
  const ethBalances: CoinBucketBalance[] = [];
  for (const beneficiary of [beneficiaryForPerson1, beneficiaryForPerson2]) {
    ethBalances.push({
      to: beneficiary,
      amount: Zero
    });
  }
  state[AddressZero] = ethBalances;

  return new AppInstance(
    multisigAddress,
    sortedTopLevelKeys,
    freeBalanceTimeout,
    getCoinBucketAppInterface(coinBucketAddress),
    false,
    HARD_CODED_ASSUMPTIONS.appSequenceNumberForFreeBalance,
    convertFreeBalanceStateToPlainObject(state),
    0,
    HARD_CODED_ASSUMPTIONS.freeBalanceInitialStateTimeout,
    outcomeType,
    undefined,
    // FIXME: refactor how the interpreter parameters get plumbed through
    // Note: The token field here doesn't get used because the free balance
    // can hold multiple different kinds of assets
    { limit: MaxUint256, token: AddressZero }
  );
}
