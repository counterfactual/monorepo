import { StateChannel } from "@counterfactual/machine";
import { Address, AssetType, NetworkContext } from "@counterfactual/types";
import { bigNumberify } from "ethers/utils";

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
  let stateChannel = new StateChannel(multisigAddress, owners).setupChannel(
    networkContext
  );
  const freeBalanceETH = stateChannel.getFreeBalanceFor(AssetType.ETH);

  const state = {
    alice: stateChannel.multisigOwners[0],
    bob: stateChannel.multisigOwners[1],
    aliceBalance: bigNumberify(0),
    bobBalance: bigNumberify(0)
  };

  stateChannel = stateChannel.setState(freeBalanceETH.identityHash, state);
  await store.saveStateChannel(stateChannel);
  return stateChannel;
}
