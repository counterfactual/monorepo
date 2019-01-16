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
    requestHandler.address,
    requestHandler.store,
    nodeMsg.data.params,
    nodeMsg.data.appInstanceId,
    nodeMsg.from!
  );

  if (
    !nodeIsIntermediary(
      requestHandler.address,
      nodeMsg.data.params.intermediaries
    )
  ) {
    return;
  }

  const relayedProposalMsg: ProposeVirtualMessage = {
    from: requestHandler.address,
    event: NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
    data: {
      params: nodeMsg.data.params,
      appInstanceId: nodeMsg.data.appInstanceId
    }
  };

  const nextNodeAddress = getNextNodeAddress(
    requestHandler.address,
    nodeMsg.data.params.intermediaries,
    nodeMsg.data.params.respondingAddress
  );

  await requestHandler.messagingService.send(
    nextNodeAddress,
    relayedProposalMsg
  );
}
