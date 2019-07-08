import { Address, Node } from "@counterfactual/types";

import { virtualChannelKey } from "../../../machine";
import { ProposedAppInstanceInfo, StateChannel } from "../../../models";
import { Store } from "../../../store";
import { getChannelFromPeerAddress } from "../../../utils";
import { NO_CHANNEL_BETWEEN_NODES } from "../../errors";

/**
 * Creates a ProposedAppInstanceInfo to reflect the proposal received from
 * the client.
 * @param myIdentifier
 * @param store
 * @param params
 */
export async function createProposedVirtualAppInstance(
  myIdentifier: string,
  store: Store,
  params: Node.ProposeInstallVirtualParams
): Promise<string> {
  const { intermediaries, proposedToIdentifier } = params;

  const channel = await getOrCreateStateChannelThatWrapsVirtualAppInstance(
    myIdentifier,
    proposedToIdentifier,
    intermediaries,
    store
  );

  const proposedAppInstanceInfo = new ProposedAppInstanceInfo(
    {
      ...params,
      proposedByIdentifier: myIdentifier
    },
    channel
  );

  await store.addVirtualAppInstanceProposal(proposedAppInstanceInfo);

  return proposedAppInstanceInfo.id;
}

/**
 * This determines which Node is the Node to send the msg to next during any
 * Virtual AppInstance operations.
 * @param thisAddress
 * @param intermediaries
 * @param respondingAddress
 */
export function getNextNodeAddress(
  thisAddress: string,
  intermediaries: string[],
  respondingAddress: string
): string {
  const intermediaryIndex = intermediaries.findIndex(
    intermediaryAddress => intermediaryAddress === thisAddress
  );

  if (intermediaryIndex === -1) {
    return intermediaries[0];
  }

  if (intermediaryIndex + 1 === intermediaries.length) {
    return respondingAddress;
  }

  return intermediaries[intermediaryIndex + 1];
}

export function isNodeIntermediary(
  thisAddress: Address,
  intermediaries: Address[]
): boolean {
  return intermediaries.includes(thisAddress);
}

export async function getOrCreateStateChannelThatWrapsVirtualAppInstance(
  initiatingXpub: string,
  respondingXpub: string,
  intermediaries: string[],
  store: Store
): Promise<StateChannel> {
  let stateChannel: StateChannel;
  try {
    stateChannel = await getChannelFromPeerAddress(
      initiatingXpub,
      respondingXpub,
      store
    );
  } catch (e) {
    if (
      e
        .toString()
        .includes(NO_CHANNEL_BETWEEN_NODES(initiatingXpub, respondingXpub)) &&
      intermediaries !== undefined
    ) {
      const key = virtualChannelKey(
        [initiatingXpub, respondingXpub],
        intermediaries[0]
      );
      stateChannel = StateChannel.createEmptyChannel(key, [
        initiatingXpub,
        respondingXpub
      ]);

      await store.saveStateChannel(stateChannel);
    } else {
      throw e;
    }
  }
  return stateChannel;
}
