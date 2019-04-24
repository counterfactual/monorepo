import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
// import { NODE_EVENTS, RejectInstallVirtualMessage } from "../../../types";

export default async function rejectInstallVirtualController(
  requestHandler: RequestHandler,
  params: Node.RejectInstallParams
): Promise<Node.RejectInstallResult> {
  const { appInstanceId } = params;
  const appInstanceInfo = await requestHandler.store.getProposedAppInstanceInfo(
    appInstanceId
  );

  await requestHandler.store.removeAppInstanceProposal(appInstanceId);

  // const rejectInstallVirtualMsg: RejectInstallVirtualMessage = {
  //   from: requestHandler.publicIdentifier,
  //   type: NODE_EVENTS.REJECT_INSTALL_VIRTUAL,
  //   data: {
  //     appInstanceId
  //   }
  // };

  await requestHandler.messagingService.send(
    appInstanceInfo.proposedByIdentifier,
    {
      meta: {
        from: requestHandler.publicIdentifier,
        requestId: ""
      },
      operations: [
        {
          op: "reject",
          ref: {
            type: "proposal"
          },
          data: {
            type: "proposal",
            attributes: {
              appInstanceId
            },
            relationships: {}
          }
        }
      ]
    }
  );

  return {};
}
