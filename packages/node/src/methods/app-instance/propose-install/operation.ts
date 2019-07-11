import { Node } from "@counterfactual/types";

import { ProposedAppInstanceInfo } from "../../../models";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../models/free-balance";
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

  const proposedAppInstanceInfo = new ProposedAppInstanceInfo(
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

  await store.addAppInstanceProposal(channel, proposedAppInstanceInfo);

  return proposedAppInstanceInfo.identityHash;
}
