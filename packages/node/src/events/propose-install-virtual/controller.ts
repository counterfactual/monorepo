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
  // @ts-ignore
  const { attributes } = nodeMsg.data;
  await setAppInstanceIDForProposeInstallVirtual(
    requestHandler.publicIdentifier,
    requestHandler.store,
    attributes,
    attributes.appInstanceId,
    attributes.proposedByIdentifier,
    nodeMsg.from!
  );

  if (
    !nodeIsIntermediary(
      requestHandler.publicIdentifier,
      attributes.params.intermediaries
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
          relationships: {},
          attributes
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
