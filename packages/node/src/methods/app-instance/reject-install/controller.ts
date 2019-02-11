import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, RejectProposalMessage } from "../../../types";
import rejectInstallVirtualController from "../reject-install-virtual/controller";

export default async function rejectInstallController(
  requestHandler: RequestHandler,
  params: Node.RejectInstallParams
): Promise<Node.RejectInstallResult> {
  const { appInstanceId } = params;

  const proposedAppInstanceInfo = await requestHandler.store.getProposedAppInstanceInfo(
    appInstanceId
  );

  if (proposedAppInstanceInfo.intermediaries) {
    return rejectInstallVirtualController(requestHandler, params);
  }

  await requestHandler.store.removeAppInstanceProposal(appInstanceId);

  const rejectProposalMsg: RejectProposalMessage = {
    from: requestHandler.publicIdentifier,
    type: NODE_EVENTS.REJECT_INSTALL,
    data: {
      appInstanceId
    }
  };

  await requestHandler.messagingService.send(
    proposedAppInstanceInfo.proposedByIdentifier,
    rejectProposalMsg
  );

  return {};
}
