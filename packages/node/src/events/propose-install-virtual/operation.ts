import { Node } from "@counterfactual/types";

import { getOrCreateStateChannelThatWrapsVirtualAppInstance } from "../../methods/app-instance/propose-install-virtual/operation";
import { ProposedAppInstanceInfo } from "../../models";
import { Store } from "../../store";

/**
 *
 * @param myIdentifier
 * @param store
 * @param params
 * @param appInstanceId
 * @param incomingIdentifier The address of the Node who is relaying the proposal.
 */
export async function setstringForProposeInstallVirtual(
  myIdentifier: string,
  store: Store,
  params: Node.ProposeInstallVirtualParams,
  appInstanceId: string,
  proposedByIdentifier: string,
  incomingIdentifier: string
) {
  const { intermediaries } = params;

  const channel = await getOrCreateStateChannelThatWrapsVirtualAppInstance(
    proposedByIdentifier,
    myIdentifier,
    intermediaries,
    store
  );

  const fixedDepositsParams = {
    ...params,
    myDeposit: params.peerDeposit,
    peerDeposit: params.myDeposit
  };

  const proposedAppInstanceInfo = new ProposedAppInstanceInfo(
    {
      ...fixedDepositsParams,
      proposedByIdentifier
    },
    channel
  );

  await store.addVirtualAppInstanceProposal(proposedAppInstanceInfo);

  return;
}
