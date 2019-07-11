import { Node } from "@counterfactual/types";

import { ProposedAppInstanceInfo } from "../../models";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../models/free-balance";
import { Store } from "../../store";
import { getChannelFromPeerAddress } from "../../utils";

export async function setstringForProposeInstall(
  myIdentifier: string,
  store: Store,
  params: Node.ProposeInstallParams,
  appInstanceId: string,
  proposedByIdentifier: string
) {
  const channel = await getChannelFromPeerAddress(
    myIdentifier,
    proposedByIdentifier,
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

  await store.addAppInstanceProposal(channel, proposedAppInstanceInfo);
}
