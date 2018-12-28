import ETHBucket from "@counterfactual/contracts/build/contracts/ETHBucket.json";
import { AppInterface, ETHBucketAppState } from "@counterfactual/types";
import { AddressZero, MaxUint256 } from "ethers/constants";
import {
  defaultAbiCoder,
  // formatParamType,
  Interface,
  keccak256
} from "ethers/utils";

import { APP_INTERFACE, TERMS } from "./encodings";

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
    resolve: new Interface(ETHBucket.abi).functions.resolve.sighash,
    // NOTE: The following methods are always 0x00000000 because the
    //       ETHBucketApp has no notion of state transitions. Every state
    //       update is a 2-of-2 signed update of each persons' balance
    getTurnTaker: "0x00000000",
    isStateTerminal: "0x00000000",
    applyAction: "0x00000000",
    stateEncoding: freeBalanceStateEncoding,
    actionEncoding: undefined // because no actions exist for ETHBucket
  };
}

export function getFreeBalanceAppInterfaceHash(ethBucketAppAddress: string) {
  return keccak256(
    defaultAbiCoder.encode(
      [APP_INTERFACE],
      [getFreeBalanceAppInterface(ethBucketAppAddress)]
    )
  );
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
