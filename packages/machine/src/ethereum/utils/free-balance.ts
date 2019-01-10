import { AppInterface, ETHBucketAppState } from "@counterfactual/types";
import { AddressZero, MaxUint256 } from "ethers/constants";
import {
  defaultAbiCoder,
  // formatParamType,
  keccak256
} from "ethers/utils";

import { TERMS } from "./encodings";

// FIXME: Use this when it returns named version.
// export const freeBalanceStateEncoding = formatParamType(
//   new Interface(ETHBucket.abi).functions.resolve.inputs[0]
// );
export const freeBalanceStateEncoding = `
  tuple(
    address alice,
    address bob,
    uint256 aliceBalance,
    uint256 bobBalance
  )
`;

export function getFreeBalanceAppInterface(addr: string): AppInterface {
  return {
    addr,
    stateEncoding: freeBalanceStateEncoding,
    actionEncoding: undefined // because no actions exist for ETHBucket
  };
}

export const freeBalanceTerms = {
  assetType: 0,
  limit: MaxUint256,
  token: AddressZero
};

export const freeBalanceTermsHash = keccak256(
  defaultAbiCoder.encode([TERMS], [freeBalanceTerms])
);

export function encodeFreeBalanceState(state: ETHBucketAppState) {
  return defaultAbiCoder.encode(
    [freeBalanceStateEncoding],
    // NOTE: We will be able to replace the following line with [state] after
    //       @ricmoo implements the feature to add tuple names to the result of
    //       formatParamType. See: github.com/ethers-io/ethers.js/issues/325
    // [[state.alice, state.bob, state.aliceBalance, state.bobBalance]]
    [state]
  );
}
