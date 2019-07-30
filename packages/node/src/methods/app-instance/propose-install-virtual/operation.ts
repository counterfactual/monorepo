import { NetworkContext, Node } from "@counterfactual/types";

import { AppInstanceProposal, StateChannel } from "../../../models";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../models/free-balance";
import { Store } from "../../../store";
import {
  getCreate2MultisigAddress,
  getStateChannelWithOwners
} from "../../../utils";
import { NO_CHANNEL_BETWEEN_NODES } from "../../errors";

/**
 * Creates a AppInstanceProposal to reflect the proposal received from
 * the client.
 * @param myIdentifier
 * @param store
 * @param params
 */
export async function createProposedVirtualAppInstance(
  myIdentifier: string,
  store: Store,
  params: Node.ProposeInstallVirtualParams,
  network: NetworkContext
): Promise<string> {
  const { intermediaries, proposedToIdentifier } = params;

  const channel = await getOrCreateStateChannelBetweenVirtualAppParticipants(
    myIdentifier,
    proposedToIdentifier,
    intermediaries,
    store,
    network
  );

  const appInstanceProposal = new AppInstanceProposal(
    {
      ...params,
      proposedByIdentifier: myIdentifier,
      initiatorDepositTokenAddress:
        params.initiatorDepositTokenAddress || CONVENTION_FOR_ETH_TOKEN_ADDRESS,
      responderDepositTokenAddress:
        params.responderDepositTokenAddress || CONVENTION_FOR_ETH_TOKEN_ADDRESS
    },
    channel
  );

  await store.addVirtualAppInstanceProposal(appInstanceProposal);

  return appInstanceProposal.identityHash;
}

/**
 * This determines which Node is the Node to send the msg to next during any
 * Virtual AppInstance operations.
 * @param thisAddress
 * @param intermediaries
 * @param responderAddress
 */
export function getNextNodeAddress(
  thisAddress: string,
  intermediaries: string[],
  responderAddress: string
): string {
  const intermediaryIndex = intermediaries.findIndex(
    intermediaryAddress => intermediaryAddress === thisAddress
  );

  if (intermediaryIndex === -1) {
    return intermediaries[0];
  }

  if (intermediaryIndex + 1 === intermediaries.length) {
    return responderAddress;
  }

  return intermediaries[intermediaryIndex + 1];
}

export function isNodeIntermediary(
  thisAddress: string,
  intermediaries: string[]
): boolean {
  return intermediaries.includes(thisAddress);
}

export async function getOrCreateStateChannelBetweenVirtualAppParticipants(
  initiatorXpub: string,
  responderXpub: string,
  intermediaries: string[],
  store: Store,
  network: NetworkContext
): Promise<StateChannel> {
  let stateChannel: StateChannel;
  try {
    stateChannel = await getStateChannelWithOwners(
      initiatorXpub,
      responderXpub,
      store
    );
  } catch (e) {
    if (
      e
        .toString()
        .includes(NO_CHANNEL_BETWEEN_NODES(initiatorXpub, responderXpub)) &&
      intermediaries !== undefined
    ) {
      const multisigAddress = getCreate2MultisigAddress(
        [initiatorXpub, responderXpub],
        network.ProxyFactory,
        network.MinimumViableMultisig
      );

      stateChannel = StateChannel.createEmptyChannel(multisigAddress, [
        initiatorXpub,
        responderXpub
      ]);

      await store.saveStateChannel(stateChannel);
    } else {
      throw e;
    }
  }
  return stateChannel;
}
