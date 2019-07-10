import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import Proxy from "@counterfactual/contracts/build/Proxy.json";
import { Address } from "@counterfactual/types";
import {
  BigNumber,
  getAddress,
  hashMessage,
  Interface,
  keccak256,
  solidityKeccak256,
  solidityPack
} from "ethers/utils";

import { xkeysToSortedKthAddresses } from "./machine";
import { NO_CHANNEL_BETWEEN_NODES } from "./methods/errors";
import { StateChannel } from "./models";
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
    return Promise.reject(NO_CHANNEL_BETWEEN_NODES(myIdentifier, peerAddress));
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
  const multisigAddress = await store.getMultisigAddressFromstring(
    appInstanceId
  );

  if (!multisigAddress) {
    throw new Error(
      `No multisig address found. Queried for AppInstanceId: ${appInstanceId}`
    );
  }

  return getPeersAddressFromChannel(myIdentifier, store, multisigAddress);
}

export function getCounterpartyAddress(
  myIdentifier: Address,
  appInstanceAddresses: Address[]
) {
  return appInstanceAddresses.filter(address => {
    return address !== myIdentifier;
  })[0];
}

export function getBalanceIncrement(
  beforeDeposit: BigNumber,
  afterDeposit: BigNumber
): BigNumber {
  return afterDeposit.sub(beforeDeposit);
}

export function timeout(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Computes the address of a counterfactual MinimumViableMultisig contract
 * as it would be if deployed via the `createProxyWithNonce` method on a
 * ProxyFactory contract with the bytecode of a Proxy contract pointing to
 * a `masterCopy` of a MinimumViableMultisig contract.
 *
 * See https://solidity.readthedocs.io/en/v0.5.10/assembly.html?highlight=create2
 * for information on how CREAT2 addresses are calculated.
 *
 * @export
 * @param {string[]} owners - the addresses of the owners of the multisig
 * @param {string} proxyFactoryAddress - address of ProxyFactory library
 * @param {string} minimumViableMultisigAddress - address of masterCopy of multisig
 *
 * @returns {string} the address of the multisig
 */
export function getCreate2MultisigAddress(
  owners: string[],
  proxyFactoryAddress: string,
  minimumViableMultisigAddress: string
): string {
  return getAddress(
    solidityKeccak256(
      ["bytes1", "address", "uint256", "bytes32"],
      [
        "0xff",
        proxyFactoryAddress,
        solidityKeccak256(
          ["bytes32", "uint256"],
          [
            keccak256(
              new Interface(MinimumViableMultisig.abi).functions.setup.encode([
                xkeysToSortedKthAddresses(owners, 0)
              ])
            ),
            0
          ]
        ),
        keccak256(
          solidityPack(
            ["bytes", "uint256"],
            [`0x${Proxy.bytecode}`, minimumViableMultisigAddress]
          )
        )
      ]
    ).slice(-40)
  );
}
