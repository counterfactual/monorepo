import { Node } from "@counterfactual/types";

import { AppInstanceProposal } from "../../../models";
import { Store } from "../../../store";
import { getCreate2MultisigAddress, normalizeTokenAddress } from "../../../utils";

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

  const stateChannel = await store.getStateChannel(multisigAddress);

  const appInstanceProposal = new AppInstanceProposal(
    {
      ...params,
      proposedByIdentifier: myIdentifier,
      initiatorDepositTokenAddress:
        normalizeTokenAddress(params.initiatorDepositTokenAddress),
      responderDepositTokenAddress:
        normalizeTokenAddress(params.responderDepositTokenAddress)
    },
    stateChannel
  );

  await store.addAppInstanceProposal(stateChannel, appInstanceProposal);

  return appInstanceProposal.identityHash;
}
