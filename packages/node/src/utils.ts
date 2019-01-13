import { StateChannel } from "@counterfactual/machine";
import { Address } from "@counterfactual/types";
import { BigNumber, hashMessage } from "ethers/utils";

import { Store } from "./store";

export function orderedAddressesHash(addresses: Address[]): string {
  addresses.sort((addrA: Address, addrB: Address) => {
    return new BigNumber(addrA).lt(addrB) ? -1 : 1;
  });
  return hashMessage(addresses.join(""));
}

export async function getChannelFromPeerAddress(
  selfAddress: Address,
  respondingAddress: Address,
  store: Store
): Promise<StateChannel> {
  const ownersHash = orderedAddressesHash([selfAddress, respondingAddress]);
  const multisigAddress = await store.getMultisigAddressFromOwnersHash(
    ownersHash
  );
  return await store.getStateChannel(multisigAddress);
}

export async function getPeersAddressFromAppInstanceID(
  selfAddress: Address,
  store: Store,
  appInstanceId: string
): Promise<Address[]> {
  const multisigAddress = await store.getMultisigAddressFromAppInstanceID(
    appInstanceId
  );
  const stateChannel = await store.getStateChannel(multisigAddress);
  const owners = stateChannel.multisigOwners;
  return owners.filter(owner => owner !== selfAddress);
}
