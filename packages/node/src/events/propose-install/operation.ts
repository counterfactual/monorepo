import { Node } from "@counterfactual/types";

import { ProposedAppInstanceInfo } from "../../models";
import { Store } from "../../store";
import { getChannelFromPeerAddress } from "../../utils";

export async function setAppInstanceIDForProposeInstall(
  selfAddress: string,
  store: Store,
  params: Node.ProposeInstallParams,
  appInstanceId: string,
  proposedByIdentifier: string
) {
  await store.addAppInstanceProposal(
    await getChannelFromPeerAddress(selfAddress, proposedByIdentifier, store),
    new ProposedAppInstanceInfo(appInstanceId, {
      ...params,
      proposedByIdentifier
    })
  );
}
