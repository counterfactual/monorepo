import { AppInstance } from "@counterfactual/machine";
import {
  AppABIEncodings,
  AppState,
  AssetType,
  BlockchainAsset
} from "@counterfactual/types";
import { AddressZero, One, Zero } from "ethers/constants";
import { bigNumberify, getAddress, hexlify, randomBytes } from "ethers/utils";

import { ProposedAppInstanceInfo } from "../../src/models";

export function createProposedAppInstanceInfo(appInstanceId: string) {
  return new ProposedAppInstanceInfo(appInstanceId, {
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
    } as AppState
  });
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
      applyAction: hexlify(randomBytes(4)),
      resolve: hexlify(randomBytes(4)),
      getTurnTaker: hexlify(randomBytes(4)),
      isStateTerminal: hexlify(randomBytes(4)),
      stateEncoding: "tuple(address foo, uint256 bar)",
      actionEncoding: undefined
    },
    {
      assetType: AssetType.ETH,
      limit: bigNumberify(2),
      token: AddressZero
    },
    false,
    1,
    0,
    { foo: AddressZero, bar: 0 },
    0,
    0
  );
}
