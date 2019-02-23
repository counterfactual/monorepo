import { Node } from "@counterfactual/types";
import Queue from "p-queue";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, RejectProposalMessage } from "../../../types";
import { NodeController } from "../../controller";
import rejectInstallVirtualController from "../reject-install-virtual/controller";

export default class RejectInstallController extends NodeController {
  public static readonly methodName = Node.MethodName.REJECT_INSTALL;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.RejectInstallParams
  ): Promise<Queue> {
    const { store } = requestHandler;
    const { appInstanceId } = params;

    return requestHandler.getShardedQueue(
      await store.getMultisigAddressFromAppInstanceID(appInstanceId)
    );
  }

  protected async executeMethodImplementation(
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
}
