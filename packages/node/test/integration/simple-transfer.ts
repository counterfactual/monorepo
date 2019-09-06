import { AppABIEncodings } from "@counterfactual/types";
import { Zero } from "ethers/constants";
import { bigNumberify, BigNumberish } from "ethers/utils";

const singleAssetTwoPartyCoinTransferEncoding = `
tuple(address to, uint256 amount)[2]
`;

export const simpleTransferAbiEncodings: AppABIEncodings = {
  stateEncoding: `
    tuple(
      ${singleAssetTwoPartyCoinTransferEncoding} coinTransfers
    )`,
  actionEncoding: ""
};

export function initialSimpleTransferState(
  senderAddr: string,
  receiverAddr: string,
  amount: BigNumberish = 1
) {
  return {
    coinTransfers: [
      {
        amount: bigNumberify(amount),
        to: senderAddr
      },
      {
        to: receiverAddr,
        amount: Zero
      }
    ]
  };
}
