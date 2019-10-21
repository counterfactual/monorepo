import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, RejectInstallVirtualMessage } from "../../../types";

export default async function rejectInstallVirtualController(
  requestHandler: RequestHandler,
  params: Node.RejectInstallParams
): Promise<Node.RejectInstallResult> {
  const { store, messagingService, publicIdentifier } = requestHandler;

  const { appInstanceId } = params;

  const proposal = await store.getAppInstanceProposal(appInstanceId);

  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  await store.saveStateChannel(stateChannel.removeProposal(appInstanceId));

  const rejectInstallVirtualMsg: RejectInstallVirtualMessage = {
    from: publicIdentifier,
    type: NODE_EVENTS.REJECT_INSTALL_VIRTUAL,
    data: {
      appInstanceId
    }
  };

  await messagingService.send(
    proposal.proposedByIdentifier,
    rejectInstallVirtualMsg
  );

  return {};
}
