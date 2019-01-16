import { Address, Node } from "@counterfactual/types";

import { ProposedAppInstanceInfo } from "../../models";
import { Store } from "../../store";
import { getChannelFromPeerAddress } from "../../utils";

/**
 *
 * @param selfAddress
 * @param store
 * @param params
 * @param appInstanceId
 * @param incomingAddress The address of the Node who is relaying the proposal.
 */
export async function setAppInstanceIDForProposeInstallVirtual(
  selfAddress: Address,
  store: Store,
  params: Node.ProposeInstallVirtualParams,
  appInstanceId: string,
  incomingAddress: Address
) {
  await store.addAppInstanceProposal(
    await getChannelFromPeerAddress(selfAddress, incomingAddress, store),
    new ProposedAppInstanceInfo(appInstanceId, params)
  );
}
