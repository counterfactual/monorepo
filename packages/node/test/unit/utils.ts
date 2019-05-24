import {
  AppABIEncodings,
  AssetType,
  BlockchainAsset,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { Wallet } from "ethers";
import { AddressZero, One, Zero } from "ethers/constants";
import { bigNumberify, getAddress, hexlify, randomBytes } from "ethers/utils";
import { fromMnemonic } from "ethers/utils/hdnode";

import {
  AppInstance,
  ProposedAppInstanceInfo,
  StateChannel
} from "../../src/models";

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
      } as SolidityABIEncoderV2Type
    },
    undefined,
    appInstanceId
  );
}

export function createAppInstance(stateChannel?: StateChannel) {
  return new AppInstance(
    /* multisigAddress */ stateChannel
      ? stateChannel.multisigAddress
      : getAddress(hexlify(randomBytes(20))),
    /* signingKeys */ stateChannel
      ? stateChannel.getSigningKeysFor(stateChannel.numInstalledApps)
      : [
          getAddress(hexlify(randomBytes(20))),
          getAddress(hexlify(randomBytes(20)))
        ],
    /* defaultTimeout */ 0,
    /* appInterface */ {
      addr: getAddress(hexlify(randomBytes(20))),
      stateEncoding: "tuple(address foo, uint256 bar)",
      actionEncoding: undefined
    },
    /* isVirtualApp */ false,
    /* appSeqNo */ stateChannel
      ? stateChannel.numInstalledApps
      : Math.ceil(1000 * Math.random()),
    0,
    { foo: AddressZero, bar: bigNumberify(0) },
    0,
    Math.ceil(1000 * Math.random()),
    [AddressZero, AddressZero],
    Zero
  );
}
