import { Address, Node } from "@counterfactual/types";
import { v4 as generateUUID } from "uuid";

import { ProposedAppInstanceInfo } from "../../../models";
import { RequestHandler } from "../../../request-handler";
import { Store } from "../../../store";
import { NODE_EVENTS, ProposeMessage } from "../../../types";
import { getChannelFromPeerAddress } from "../../../utils";

/**
 * This creates an entry of a proposed AppInstance while sending the proposal
 * to the peer with whom this AppInstance is specified to be installed.
 * @param params
 * @returns The AppInstanceId for the proposed AppInstance
 */
export async function proposeInstallAppInstanceController(
  requestHandler: RequestHandler,
  params: Node.ProposeInstallParams
): Promise<Node.ProposeInstallResult> {
  if (params.abiEncodings.actionEncoding === undefined) {
    delete params.abiEncodings.actionEncoding;
  }

  const appInstanceId = await createProposedAppInstance(
    requestHandler.address,
    requestHandler.store,
    params
  );

  const proposalMsg: ProposeMessage = {
    from: requestHandler.address,
    event: NODE_EVENTS.PROPOSE_INSTALL,
    data: {
      params,
      appInstanceId
    }
  };

  await requestHandler.messagingService.send(
    params.respondingAddress,
    proposalMsg
  );

  return {
    appInstanceId
  };
}

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
