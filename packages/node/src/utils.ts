import { StateChannel } from "@counterfactual/machine";
import { Address } from "@counterfactual/types";
import { hashMessage } from "ethers/utils";

import { Store } from "./store";

export function hashOfOrderedPublicIdentifiers(addresses: Address[]): string {
  return hashMessage(addresses.sort().join(""));
}

/**
 *
 * @param myIdentifier
 * @param peerAddress Peer Address could either be an intermediary or a
 *        `respondingAddress` which is the targeted peer in a Virtual AppInstance
 *        operation.
 * @param store
 */
export async function getChannelFromPeerAddress(
  myIdentifier: string,
  peerAddress: string,
  store: Store
): Promise<StateChannel> {
  const ownersHash = hashOfOrderedPublicIdentifiers([
    myIdentifier,
    peerAddress
  ]);

  const multisigAddress = await store.getMultisigAddressFromOwnersHash(
    ownersHash
  );

  if (!multisigAddress) {
    return Promise.reject(
      `No channel exists between the current user ${myIdentifier} and the peer ${peerAddress}`
    );
  }

  return await store.getStateChannel(multisigAddress);
}

export async function getPeersAddressFromChannel(
  myIdentifier: string,
  store: Store,
  multisigAddress: string
): Promise<Address[]> {
  const stateChannel = await store.getStateChannel(multisigAddress);
  const owners = stateChannel.userNeuteredExtendedKeys;
  return owners.filter(owner => owner !== myIdentifier);
}

export async function getPeersAddressFromAppInstanceID(
  myIdentifier: Address,
  store: Store,
  appInstanceId: string
): Promise<Address[]> {
  const multisigAddress = await store.getMultisigAddressFromAppInstanceID(
    appInstanceId
  );

  if (!multisigAddress) {
    throw new Error(
      `No multisig address found. Queried for AppInstanceId: ${appInstanceId}`
    );
  }

  return getPeersAddressFromChannel(myIdentifier, store, multisigAddress);
}

export function isNotDefinedOrEmpty(str?: string) {
  return !str || str.trim() === "";
}

export function getCounterpartyAddress(
  myIdentifier: Address,
  appInstanceAddresses: Address[]
) {
  return appInstanceAddresses.filter(address => {
    return address !== myIdentifier;
  })[0];
}
