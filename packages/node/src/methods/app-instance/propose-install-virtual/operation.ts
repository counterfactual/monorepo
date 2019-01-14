import { Address, Node } from "@counterfactual/types";
import { v4 as generateUUID } from "uuid";

import { ProposedAppInstanceInfo } from "../../../models";
import { Store } from "../../../store";
import { getChannelFromPeerAddress } from "../../../utils";

/**
 * Creates a ProposedAppInstanceInfo to reflect the proposal received from
 * the client.
 * @param selfAddress
 * @param store
 * @param params
 */
export async function createProposedVirtualAppInstance(
  selfAddress: Address,
  store: Store,
  params: Node.ProposeInstallVirtualParams
): Promise<string> {
  const appInstanceId = generateUUID();
  const nextIntermediaryAddress = getNextNodeAddress(
    selfAddress,
    params.intermediaries,
    params.respondingAddress
  );

  const channel = await getChannelFromPeerAddress(
    selfAddress,
    nextIntermediaryAddress,
    store
  );

  const proposedAppInstance = new ProposedAppInstanceInfo(
    appInstanceId,
    params
  );

  await store.addAppInstanceProposal(channel, proposedAppInstance);
  return appInstanceId;
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
