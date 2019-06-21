import {
  AppInterface,
  CoinBucketBalance,
  DecodedFreeBalance
} from "@counterfactual/types";
import { Zero } from "ethers/constants";
import { BigNumber, bigNumberify } from "ethers/utils";

import {
  CoinBucketBalances,
  FreeBalanceState
} from "../../models/free-balance";

const coinBucketStateEncoding = `
  tuple(
    address[] tokenAddresses,
    tuple(
      address to,
      uint256 amount
    )[] balances
  )
`;

export function getCoinBucketAppInterface(addr: string): AppInterface {
  return {
    addr,
    stateEncoding: coinBucketStateEncoding,
    actionEncoding: undefined // because no actions exist for CoinBucket
  };
}

export function encodeFreeBalanceAppState(state: FreeBalanceState) {
  const encoding = {} as DecodedFreeBalance;
  for (const coinBucket of Object.entries(state)) {
    encoding.tokenAddresses.push(coinBucket[0]);

    const coinBucketBalances = coinBucket[1];
    const balances: CoinBucketBalance[] = [];

    for (const balance of Object.entries(coinBucketBalances)) {
      balances.push({
        to: balance[0],
        amount: {
          _hex: balance[1].toHexString()
        }
      });
    }
  }
  return encoding;
}

/**
 * For manipulating `CoinBucket` state, the most convenient type to pass around
 * is the following mapping from address to balance via `CoinBucketBalances`.
 * This function converts encoded `CoinBucket` app states into `CoinBucketBalances`.
 */
export const decodeCoinBucketBalances = (
  appState: CoinBucketBalance[]
): CoinBucketBalances => {
  const ret: CoinBucketBalances = {};
  for (const { to, amount } of appState) {
    ret[to] = bigNumberify(amount._hex);
  }
  return ret;
};

/**
 * Returns a mapping with all values negated
 */
export function flip(a: { [s: string]: BigNumber }) {
  const ret = {};
  for (const key of Object.keys(a)) {
    ret[key] = Zero.sub(a[key]);
  }
  return ret;
}

/**
 * Returns the first base mapping, but incremented by values specified in the
 * second increment
 * Passing increments whose keys are not present in the base is an error.
 * Keys in the base mapping which are not explicitly incremented are returned
 * unchanged.
 */
export function merge(
  base: CoinBucketBalances,
  increments: CoinBucketBalances
) {
  const ret = {} as CoinBucketBalances;
  for (const key of Object.keys(base)) {
    if (increments[key]) {
      ret[key] = base[key].add(increments[key]);
      if (ret[key].lt(Zero)) {
        throw new Error("Underflow in merge");
      }
    } else {
      ret[key] = base[key];
    }
  }
  for (const key of Object.keys(increments)) {
    if (!base[key]) {
      throw Error(`mismatch ${Object.keys(base)} ${Object.keys(increments)}`);
    }
  }
  return ret;
}
