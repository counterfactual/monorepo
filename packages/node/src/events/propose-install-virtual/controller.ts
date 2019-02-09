import {
  getNextNodeAddress,
  isNodeIntermediary as nodeIsIntermediary
} from "../../methods/app-instance/propose-install-virtual/operation";
import { RequestHandler } from "../../request-handler";
import { NODE_EVENTS, ProposeVirtualMessage } from "../../types";

import { setAppInstanceIDForProposeInstallVirtual } from "./operation";

/**
 *
 * @param requestHandler
 * @param nodeMsg
 */
export default async function proposeInstallVirtualEventController(
  requestHandler: RequestHandler,
  nodeMsg: ProposeVirtualMessage
) {
  await setAppInstanceIDForProposeInstallVirtual(
    requestHandler.publicIdentifier,
    requestHandler.store,
    nodeMsg.data.params,
    nodeMsg.data.appInstanceId,
    nodeMsg.data.proposedByAddress,
    nodeMsg.from!
  );

  if (
    !nodeIsIntermediary(
      requestHandler.publicIdentifier,
      nodeMsg.data.params.intermediaries
    )
  ) {
    return;
  }

  const relayedProposalMsg: ProposeVirtualMessage = {
    from: requestHandler.publicIdentifier,
    type: NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
    data: nodeMsg.data
  };

  const nextNodeAddress = getNextNodeAddress(
    requestHandler.publicIdentifier,
    nodeMsg.data.params.intermediaries,
    nodeMsg.data.params.proposedToIdentifier
  );

  await requestHandler.messagingService.send(
    nextNodeAddress,
    relayedProposalMsg
  );
}
