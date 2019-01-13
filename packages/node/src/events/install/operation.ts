import { Address, Node } from "@counterfactual/types";

import { ProposedAppInstanceInfo } from "../../models";
import { Store } from "../../store";
import { getChannelFromPeerAddress } from "../../utils";

export async function setAppInstanceIDForProposeInstall(
  selfAddress: Address,
  store: Store,
  params: Node.InterNodeProposeInstallParams
) {
  const channel = await getChannelFromPeerAddress(
    selfAddress,
    params.respondingAddress,
    store
  );
  const proposedAppInstance = new ProposedAppInstanceInfo(
    params.appInstanceId,
    params
  );

  await store.addAppInstanceProposal(channel, proposedAppInstance);
}
