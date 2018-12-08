import { ethers } from "ethers";

import ETHBucket from "@counterfactual/contracts/build/contracts/ETHBucket.json";
import { ETHBucketAppState } from "@counterfactual/types";

import { APP_INTERFACE, TERMS } from "./encodings";

const { Interface, keccak256, defaultAbiCoder, formatParamType } = ethers.utils;
const { AddressZero, MaxUint256 } = ethers.constants;

export function getFreeBalanceAppInterface(address: string) {
  return {
    addr: AddressZero,
    resolve: new Interface(ETHBucket.abi).functions.resolve.sighash,
    getTurnTaker: "0x00000000",
    isStateTerminal: "0x00000000",
    applyAction: "0x00000000"
  };
}

export function getFreeBalanceAppInterfaceHash(address: string) {
  return keccak256(
    defaultAbiCoder.encode(
      [APP_INTERFACE],
      [getFreeBalanceAppInterface(address)]
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
  const input = new Interface(ETHBucket.abi).functions.resolve.inputs[0];
  const paramType = formatParamType(input);
  return defaultAbiCoder.encode(
    [paramType],
    [[state.alice, state.bob, state.aliceBalance, state.bobBalance]]
  );
}
