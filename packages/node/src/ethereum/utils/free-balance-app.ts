import { AppInterface } from "@counterfactual/types";
import { Zero } from "ethers/constants";
import { BigNumber } from "ethers/utils";

import {
  CoinTransferMap,
  TokenIndexedCoinTransferMap
} from "../../models/free-balance";

const freeBalanceAppStateEncoding = `
  tuple(
    address[] tokenAddresses,
    tuple(
      address to,
      uint256 amount
    )[][] balances,
    bytes32[] activeApps
  )
`;

export function getFreeBalanceAppInterface(addr: string): AppInterface {
  return {
    addr,
    stateEncoding: freeBalanceAppStateEncoding,
    actionEncoding: undefined // because no actions exist for FreeBalanceApp
  };
}

export function flipTokenIndexedBalances(
  tokenIndexedBalances: TokenIndexedCoinTransferMap
): TokenIndexedCoinTransferMap {
  return Object.entries(tokenIndexedBalances).reduce(
    (returnValueAccumulator, [tokenAddress, balances]) => ({
      ...returnValueAccumulator,
      [tokenAddress]: flip(balances)
    }),
    {}
  );
}

/**
 * Returns a mapping with all values negated
 */
export function flip(coinTransferMap: CoinTransferMap): CoinTransferMap {
  return Object.entries(coinTransferMap).reduce(
    (returnValueAccumulator, [to, amount]) => ({
      ...returnValueAccumulator,
      [to]: Zero.sub(amount)
    }),
    {}
  );
}

/**
 * Returns the first base mapping, but incremented by values specified in the
 * second increment. Passing increments whose keys are not present in the base
 * sets them to the increment. Keys in the base mapping which are not explicitly
 * incremented are returned unchanged.
 */
export function merge(
  base: { [s: string]: BigNumber },
  increments: { [s: string]: BigNumber }
) {
  const ret = {} as { [s: string]: BigNumber };

  const s1 = new Set(Object.keys(base));
  const s2 = new Set(Object.keys(increments));

  for (const key of new Set([...s1, ...s2])) {
    ret[key] = (base[key] || Zero).add(increments[key] || Zero);
    if (ret[key].lt(Zero)) {
      throw new Error("Underflow in merge");
    }
  }

  return ret;
}
