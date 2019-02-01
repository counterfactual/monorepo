import { Node } from "@counterfactual/types";

import { ProposedAppInstanceInfo } from "../../models";
import { Store } from "../../store";
import { getChannelFromPeerAddress } from "../../utils";

/**
 *
 * @param myIdentifier
 * @param store
 * @param params
 * @param appInstanceId
 * @param incomingAddress The address of the Node who is relaying the proposal.
 */
export async function setAppInstanceIDForProposeInstallVirtual(
  myIdentifier: string,
  store: Store,
  params: Node.ProposeInstallVirtualParams,
  appInstanceId: string,
  proposedByIdentifier: string,
  incomingIdentifier: string
) {
  const channel = await getChannelFromPeerAddress(
    myIdentifier,
    incomingIdentifier,
    store
  );

  const proposedAppInstanceInfo = new ProposedAppInstanceInfo(
    {
      ...params,
      proposedByIdentifier
    },
    channel
  );

  await store.addAppInstanceProposal(channel, proposedAppInstanceInfo);
}
