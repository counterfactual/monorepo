import { AppInterface, ETHBucketAppState } from "@counterfactual/types";
import { Zero } from "ethers/constants";
import { BigNumber, bigNumberify, defaultAbiCoder } from "ethers/utils";

const ethBucketStateEncoding = `
  tuple(
    address to,
    uint256 amount
  )[]
`;

export function getETHBucketAppInterface(addr: string): AppInterface {
  return {
    addr,
    stateEncoding: ethBucketStateEncoding,
    actionEncoding: undefined // because no actions exist for ETHBucket
  };
}

export function encodeETHBucketAppState(state: ETHBucketAppState) {
  return defaultAbiCoder.encode([ethBucketStateEncoding], [state]);
}

/**
 * For manipulating ETHBucket state, the most convenient type to pass around
 * is the following mapping from address to balance
 *
 * { [s: string]: BigNumber }
 *
 * The following function converts encoded ETHBucket app states into this type
 */
export const fromAppState = (
  appState: ETHBucketAppState
): { [s: string]: BigNumber } => {
  const ret = {};
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
  base: { [s: string]: BigNumber },
  increments: { [s: string]: BigNumber }
) {
  const ret = {} as { [s: string]: BigNumber };
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
