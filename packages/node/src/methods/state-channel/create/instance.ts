import { StateChannel } from "@counterfactual/machine";
import { Address, AssetType, NetworkContext } from "@counterfactual/types";
import { Zero } from "ethers/constants";

import { Store } from "../../../store";

/**
 * This instantiates a StateChannel object to encapsulate the "channel"
 * having been opened via the creation of the multisig.
 * @param multisigAddress
 * @param owners
 * @param store
 * @param networkContext
 */
export async function openStateChannel(
  multisigAddress: Address,
  owners: Address[],
  store: Store,
  networkContext: NetworkContext
): Promise<StateChannel> {
  const stateChannel = new StateChannel(multisigAddress, owners)
    .setupChannel(networkContext)
    .setFreeBalanceFor(AssetType.ETH, {
      alice: owners[0],
      bob: owners[1],
      aliceBalance: Zero,
      bobBalance: Zero
    });

  await store.saveStateChannel(stateChannel);

  return stateChannel;
}
