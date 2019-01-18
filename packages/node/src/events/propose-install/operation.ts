import { Address, Node } from "@counterfactual/types";

import { ProposedAppInstanceInfo } from "../../models";
import { Store } from "../../store";
import { getChannelFromPeerAddress } from "../../utils";

export async function setAppInstanceIDForProposeInstall(
  selfAddress: Address,
  store: Store,
  params: Node.ProposeInstallParams,
  appInstanceId: string,
  initiatingAddress: Address
) {
  await store.addAppInstanceProposal(
    await getChannelFromPeerAddress(selfAddress, initiatingAddress, store),
    new ProposedAppInstanceInfo(appInstanceId, { ...params, initiatingAddress })
  );
}
