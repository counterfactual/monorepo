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
export async function createProposedAppInstance(
  selfAddress: Address,
  store: Store,
  params: Node.ProposeInstallParams
): Promise<string> {
  const appInstanceId = generateUUID();
  const channel = await getChannelFromPeerAddress(
    selfAddress,
    params.respondingAddress,
    store
  );

  const proposedAppInstance = new ProposedAppInstanceInfo(
    appInstanceId,
    params
  );

  await store.addAppInstanceProposal(channel, proposedAppInstance);
  return appInstanceId;
}
