import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, ProposeMessage } from "../../../types";
import { ERRORS } from "../../errors";

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
  if (!params.initialState) {
    return Promise.reject(ERRORS.NULL_INITIAL_STATE_FOR_PROPOSAL);
  }

  const appInstanceId = await createProposedAppInstance(
    requestHandler.publicIdentifier,
    requestHandler.store,
    params
  );

  const proposalMsg: ProposeMessage = {
    from: requestHandler.publicIdentifier,
    type: NODE_EVENTS.PROPOSE_INSTALL,
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
