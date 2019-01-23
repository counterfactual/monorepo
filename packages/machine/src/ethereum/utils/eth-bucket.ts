import { AppInterface, ETHBucketAppState, Terms } from "@counterfactual/types";
import { AddressZero, MaxUint256 } from "ethers/constants";
import { defaultAbiCoder } from "ethers/utils";

// FIXME: Use this when it returns named version.
// export const freeBalanceStateEncoding = formatParamType(
//   new Interface(ETHBucket.abi).functions.resolve.inputs[0]
// );
const ethBucketStateEncoding = `
  tuple(
    address alice,
    address bob,
    uint256 aliceBalance,
    uint256 bobBalance
  )
`;

export function getETHBucketAppInterface(addr: string): AppInterface {
  return {
    addr,
    stateEncoding: ethBucketStateEncoding,
    actionEncoding: undefined // because no actions exist for ETHBucket
  };
}

/// A StateChannelTransaction commitment that uses this as the terms will accept
/// any resolution that is a resolution to ETH, with no limit on the amount of
/// ETH returned by the resolution. The commitment to the free balance app
/// instance uses this as the terms.
export const unlimitedETH: Terms = {
  assetType: 0,
  limit: MaxUint256,
  token: AddressZero
};

export function encodeETHBucketAppState(state: ETHBucketAppState) {
  return defaultAbiCoder.encode([ethBucketStateEncoding], [state]);
}
