import { Node } from "@counterfactual/types";
import { jsonRpcMethod } from "rpc-server";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, RejectProposalMessage } from "../../../types";
import { NodeController } from "../../controller";
import rejectInstallVirtualController from "../reject-install-virtual/controller";

export default class RejectInstallController extends NodeController {
  protected async getShardKeysForQueueing(
    requestHandler: RequestHandler,
    params: Node.RejectInstallParams
  ): Promise<string[]> {
    const { appInstanceId } = params;

    return [appInstanceId];
  }

  @jsonRpcMethod(Node.RpcMethodName.REJECT_INSTALL)
  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.RejectInstallParams
  ): Promise<Node.RejectInstallResult> {
    const { store, messagingService, publicIdentifier } = requestHandler;

    const { appInstanceId } = params;

    const appInstanceProposal = await store.getAppInstanceProposal(
      appInstanceId
    );

    if (appInstanceProposal.intermediaryIdentifier) {
      return rejectInstallVirtualController(requestHandler, params);
    }

    await store.removeAppInstanceProposal(appInstanceId);

    const rejectProposalMsg: RejectProposalMessage = {
      from: publicIdentifier,
      type: NODE_EVENTS.REJECT_INSTALL,
      data: {
        appInstanceId
      }
    };

    await messagingService.send(
      appInstanceProposal.proposedByIdentifier,
      rejectProposalMsg
    );

    return {};
  }
}
