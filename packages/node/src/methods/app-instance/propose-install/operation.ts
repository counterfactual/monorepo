import { Node } from "@counterfactual/types";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../constants";
import { AppInstanceProposal } from "../../../models";
import { Store } from "../../../store";
import { getCreate2MultisigAddress } from "../../../utils";

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
  networkContext,
  params: Node.ProposeInstallParams
): Promise<string> {
  const { proposedToIdentifier } = params;

  const multisigAddress = getCreate2MultisigAddress(
    [myIdentifier, proposedToIdentifier],
    networkContext.ProxyFactory,
    networkContext.MinimumViableMultisig
  );

  const stateChannel = await store.getOrCreateStateChannelBetweenVirtualAppParticipants(
    multisigAddress,
    myIdentifier,
    proposedToIdentifier
  );

  const appInstanceProposal = new AppInstanceProposal(
    {
      ...params,
      proposedByIdentifier: myIdentifier,
      initiatorDepositTokenAddress:
        params.initiatorDepositTokenAddress || CONVENTION_FOR_ETH_TOKEN_ADDRESS,
      responderDepositTokenAddress:
        params.responderDepositTokenAddress || CONVENTION_FOR_ETH_TOKEN_ADDRESS
    },
    stateChannel
  );

  await store.saveStateChannel(stateChannel.addProposal(appInstanceProposal));

  return appInstanceProposal.identityHash;
}
