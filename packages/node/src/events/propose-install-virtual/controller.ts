import {
  getNextNodeAddress,
  isNodeIntermediary as nodeIsIntermediary
} from "../../methods/app-instance/propose-install-virtual/operation";
import { RequestHandler } from "../../request-handler";
import { NodeOperation, ProposeVirtualMessage } from "../../types";

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
  console.log("nodeMessage in install virtual", JSON.stringify(nodeMsg))
  await setAppInstanceIDForProposeInstallVirtual(
    requestHandler.publicIdentifier,
    requestHandler.store,
    // @ts-ignore
    nodeMsg.data.attributes,
    // @ts-ignore
    nodeMsg.data.attributes.appInstanceId,
    // @ts-ignore
    nodeMsg.data.attributes.proposedByIdentifier,
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

  const relayedProposalMsg: NodeOperation = {
    meta: {
      from: requestHandler.publicIdentifier,
      requestId: ""
    },
    operations: [
      {
        op: "installVirtual",
        ref: {
          type: "proposal"
        },
        data: {
          type: "proposal",
          attributes: nodeMsg.data,
          relationships: {}
        }
      }
    ]
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
