import { Node } from "@counterfactual/types";

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
export async function createProposedAppInstance(
  myIdentifier: string,
  store: Store,
  params: Node.ProposeInstallParams
): Promise<string> {
  const channel = await getChannelFromPeerAddress(
    myIdentifier,
    params.proposedToIdentifier,
    store
  );

  const proposedAppInstance = new ProposedAppInstanceInfo(
    {
      ...params,
      proposedByIdentifier: myIdentifier
    },
    channel
  );

  await store.addAppInstanceProposal(channel, proposedAppInstance);

  return proposedAppInstance.id;
}
