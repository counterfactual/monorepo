import {
  AppABIEncodings,
  AppState,
  AssetType,
  BlockchainAsset
} from "@counterfactual/types";
import { AddressZero, One, Zero } from "ethers/constants";

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
