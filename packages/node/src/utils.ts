import { StateChannel } from "@counterfactual/machine";
import { Address } from "@counterfactual/types";
import { hashMessage } from "ethers/utils";

import { Store } from "./store";

export function hashOfOrderedPublicIdentifiers(addresses: Address[]): string {
  return hashMessage(addresses.sort().join(""));
}

/**
 *
 * @param selfAddress
 * @param peerAddress Peer Address could either be an intermediary or a
 *        `respondingAddress` which is the targeted peer in a Virtual AppInstance
 *        operation.
 * @param store
 */
export async function getChannelFromPeerAddress(
  selfAddress: string,
  peerAddress: string,
  store: Store
): Promise<StateChannel> {
  const ownersHash = hashOfOrderedPublicIdentifiers([selfAddress, peerAddress]);

  const multisigAddress = await store.getMultisigAddressFromOwnersHash(
    ownersHash
  );

  if (!multisigAddress) {
    return Promise.reject(
      `No channel exists between the current user ${selfAddress} and the peer ${peerAddress}`
    );
  }

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
  const owners = stateChannel.userExtendedPublicKeys;
  return owners.filter(owner => owner !== selfAddress);
}

export function isNotDefinedOrEmpty(str?: string) {
  return !str || str.trim() === "";
}

export function getCounterpartyAddress(
  selfAddress: Address,
  appInstanceAddresses: Address[]
) {
  return appInstanceAddresses.filter(address => {
    return address !== selfAddress;
  })[0];
}
