import { Node } from "@counterfactual/types";

import { getOrCreateStateChannelThatWrapsVirtualAppInstance } from "../../methods/app-instance/propose-install-virtual/operation";
import { ProposedAppInstanceInfo } from "../../models";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../models/free-balance";
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
      proposedByIdentifier,
      myDepositTokenAddress:
        params.myDepositTokenAddress || CONVENTION_FOR_ETH_TOKEN_ADDRESS,
      peerDepositTokenAddress:
        params.peerDepositTokenAddress || CONVENTION_FOR_ETH_TOKEN_ADDRESS
    },
    channel
  );

  await store.addVirtualAppInstanceProposal(proposedAppInstanceInfo);

  return;
}
