import { Address, Node } from "@counterfactual/types";

import { ProposedAppInstanceInfo } from "../../models";
import { Store } from "../../store";
import { getChannelFromPeerAddress } from "../../utils";

export async function setAppInstanceIDForProposeInstallVirtual(
  selfAddress: Address,
  store: Store,
  params: Node.ProposeInstallVirtualParams,
  appInstanceId: string,
  respondingAddress: Address
) {
  const channel = await getChannelFromPeerAddress(
    selfAddress,
    respondingAddress,
    store
  );
  const proposedAppInstance = new ProposedAppInstanceInfo(
    appInstanceId,
    params
  );

  await store.addAppInstanceProposal(channel, proposedAppInstance);
}
