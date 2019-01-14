import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, ProposeMessage } from "../../../types";

import { createProposedAppInstance } from "./operation";

/**
 * This creates an entry of a proposed AppInstance while sending the proposal
 * to the peer with whom this AppInstance is specified to be installed.
 * @param params
 * @returns The AppInstanceId for the proposed AppInstance
 */
export default async function proposeInstallAppInstanceController(
  requestHandler: RequestHandler,
  params: Node.ProposeInstallParams
): Promise<Node.ProposeInstallResult> {
  // The client can ignore setting the Node's address, but the peers need to know
  // who the initiating address is
  params.initiatingAddress = requestHandler.address;

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
