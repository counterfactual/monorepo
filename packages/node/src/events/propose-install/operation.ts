import { Node } from "@counterfactual/types";

import { ProposedAppInstanceInfo } from "../../models";
import { Store } from "../../store";
import { getChannelFromPeerAddress } from "../../utils";

export async function setAppInstanceIDForProposeInstall(
  myIdentifier: string,
  store: Store,
  params: Node.ProposeInstallParams,
  appInstanceId: string,
  proposedByIdentifier: string
) {
  const channel = await getChannelFromPeerAddress(
    myIdentifier,
    proposedByIdentifier,
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
