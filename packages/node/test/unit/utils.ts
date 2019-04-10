import {
  AppABIEncodings,
  AssetType,
  BlockchainAsset,
  SolidityABIEncoderV2Struct
} from "@counterfactual/types";
import { Wallet } from "ethers";
import { AddressZero, One, Zero } from "ethers/constants";
import { bigNumberify, getAddress, hexlify, randomBytes } from "ethers/utils";
import { fromMnemonic } from "ethers/utils/hdnode";

import { AppInstance } from "../../src/machine";
import { ProposedAppInstanceInfo } from "../../src/models";

export function computeRandomXpub() {
  return fromMnemonic(Wallet.createRandom().mnemonic).neuter().extendedKey;
}

export function createProposedAppInstanceInfo(appInstanceId: string) {
  return new ProposedAppInstanceInfo(
    {
      proposedByIdentifier: computeRandomXpub(),
      proposedToIdentifier: computeRandomXpub(),
      appId: AddressZero,
      abiEncodings: {
        stateEncoding: "tuple(address foo, uint256 bar)",
        actionEncoding: undefined
      } as AppABIEncodings,
      asset: {
        assetType: AssetType.ETH
      } as BlockchainAsset,
      myDeposit: Zero,
      peerDeposit: Zero,
      timeout: One,
      initialState: {
        foo: AddressZero,
        bar: 0
      } as SolidityABIEncoderV2Struct
    },
    undefined,
    appInstanceId
  );
}

export function createAppInstance() {
  return new AppInstance(
    getAddress(hexlify(randomBytes(20))),
    [
      getAddress(hexlify(randomBytes(20))),
      getAddress(hexlify(randomBytes(20)))
    ],
    0,
    {
      addr: getAddress(hexlify(randomBytes(20))),
      stateEncoding: "tuple(address foo, uint256 bar)",
      actionEncoding: undefined
    },
    {
      assetType: AssetType.ETH,
      limit: bigNumberify(2),
      token: AddressZero
    },
    false,
    // TODO: this should be thread-safe
    1,
    0,
    { foo: AddressZero, bar: bigNumberify(0) },
    0,
    0
  );
}
