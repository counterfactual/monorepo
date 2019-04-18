import { Address, Node } from "@counterfactual/types";

import { StateChannel, virtualChannelKey } from "../../../machine";
import { ProposedAppInstanceInfo } from "../../../models";
import { Store } from "../../../store";
import { getChannelFromPeerAddress } from "../../../utils";
import { ERRORS } from "../../errors";

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

  const channel = await getOrCreateVirtualChannel(
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
  thisAddress: Address,
  intermediaries: Address[],
  respondingAddress: Address
): Address {
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

export async function getOrCreateVirtualChannel(
  initiatorIdentifier: string,
  respondingIdentifier: string,
  intermediaries: string[],
  store: Store
): Promise<StateChannel> {
  let channel: StateChannel;
  try {
    channel = await getChannelFromPeerAddress(
      initiatorIdentifier,
      respondingIdentifier,
      store
    );
  } catch (e) {
    if (
      e.includes(
        ERRORS.NO_CHANNEL_BETWEEN_NODES(
          initiatorIdentifier,
          respondingIdentifier
        )
      ) &&
      intermediaries !== undefined
    ) {
      const key = virtualChannelKey(
        [initiatorIdentifier, respondingIdentifier],
        intermediaries[0]
      );
      channel = StateChannel.createEmptyChannel(key, [
        initiatorIdentifier,
        respondingIdentifier
      ]);

      await store.saveStateChannel(channel);
    } else {
      return Promise.reject(e);
    }
  }
  return channel;
}
