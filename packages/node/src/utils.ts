import { AppInstance, StateChannel } from "@counterfactual/machine";
import { Address, AppState } from "@counterfactual/types";
import { Contract } from "ethers";
import { BaseProvider } from "ethers/providers";
import { BigNumber, defaultAbiCoder, hashMessage } from "ethers/utils";

import { ERRORS } from "./methods/errors";
import { Store } from "./store";

export function orderedAddressesHash(addresses: Address[]): string {
  addresses.sort((addrA: Address, addrB: Address) => {
    return new BigNumber(addrA).lt(addrB) ? -1 : 1;
  });
  return hashMessage(addresses.join(""));
}

export async function getChannelFromPeerAddress(
  selfAddress: Address,
  peerAddress: Address,
  store: Store
): Promise<StateChannel> {
  const ownersHash = orderedAddressesHash([selfAddress, peerAddress]);
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

export async function confirmAppInstanceExists(
  store: Store,
  appInstanceId: string
): Promise<boolean> {
  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);
  if (!stateChannel) {
    console.log("nope");
    return Promise.reject(ERRORS.NO_APP_INSTANCE_FOR_APP_INSTANCE_ID);
  }
  return true;
}

export function getAppContractToApplyAction(
  appInstance: AppInstance,
  provider: BaseProvider
): Contract {
  if (
    !appInstance.appInterface.addr ||
    appInstance.appInterface.addr.trim() === ""
  ) {
    throw Error(ERRORS.UNSPECIFIED_CONTRACT_ADDRESS);
  }

  if (
    !appInstance.appInterface.stateEncoding ||
    appInstance.appInterface.stateEncoding.trim() === ""
  ) {
    throw Error(ERRORS.UNSPECIFIED_CONTRACT_ADDRESS);
  }

  const abi = [
    `function applyAction(${appInstance.appInterface.stateEncoding} state, ${
      appInstance.appInterface.actionEncoding
    } action) public pure returns (bytes)`
  ];

  console.log("abi for new contract");
  console.log(abi);
  return new Contract(appInstance.appInterface.addr, abi, provider);
}

export function decodeAppState(
  encodedAppState: string,
  appStateEncoding: string
): AppState {
  return defaultAbiCoder.decode([appStateEncoding], encodedAppState)[0];
}
