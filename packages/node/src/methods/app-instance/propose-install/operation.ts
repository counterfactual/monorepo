import { Node } from "@counterfactual/types";

import { AppInstanceProposal } from "../../../models";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../models/free-balance";
import { Store } from "../../../store";
import { getStateChannelWithOwners } from "../../../utils";

/**
 * Creates a AppInstanceProposal to reflect the proposal received from
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
  const channel = await getStateChannelWithOwners(
    myIdentifier,
    params.proposedToIdentifier,
    store
  );

  const appInstanceProposal = new AppInstanceProposal(
    {
      ...params,
      proposedByIdentifier: myIdentifier,
      myDepositTokenAddress:
        params.myDepositTokenAddress || CONVENTION_FOR_ETH_TOKEN_ADDRESS,
      peerDepositTokenAddress:
        params.peerDepositTokenAddress || CONVENTION_FOR_ETH_TOKEN_ADDRESS
    },
    channel
  );

  await store.addAppInstanceProposal(channel, appInstanceProposal);

  return appInstanceProposal.identityHash;
}
