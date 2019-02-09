import { Address, Node } from "@counterfactual/types";

import { ProposedAppInstanceInfo } from "../../../models";
import { Store } from "../../../store";
import { getChannelFromPeerAddress } from "../../../utils";

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
  const nextIntermediaryAddress = getNextNodeAddress(
    myIdentifier,
    params.intermediaries,
    params.proposedToIdentifier
  );

  const channel = await getChannelFromPeerAddress(
    myIdentifier,
    nextIntermediaryAddress,
    store
  );

  const proposedAppInstanceInfo = new ProposedAppInstanceInfo(
    {
      ...params,
      proposedByIdentifier: myIdentifier
    },
    channel
  );

  await store.addAppInstanceProposal(channel, proposedAppInstanceInfo);

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
