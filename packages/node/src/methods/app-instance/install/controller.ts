import { Node } from "@counterfactual/types";
import Queue from "p-queue";

import { RequestHandler } from "../../../request-handler";
import { InstallMessage, NODE_EVENTS } from "../../../types";
import { getPeersAddressFromAppInstanceID } from "../../../utils";
import { NodeController } from "../../controller";

import { install } from "./operation";

/**
 * This converts a proposed app instance to an installed app instance while
 * sending an approved ack to the proposer.
 * @param params
 */
export default class InstallController extends NodeController {
  public static readonly methodName = Node.MethodName.INSTALL;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.InstallParams
  ): Promise<Queue> {
    const { store } = requestHandler;
    const { appInstanceId } = params;
    return requestHandler.getShardedQueue(
      await store.getMultisigAddressFromAppInstanceID(appInstanceId)
    );
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.InstallParams
  ): Promise<Node.InstallResult> {
    const {
      store,
      instructionExecutor,
      publicIdentifier,
      messagingService
    } = requestHandler;

    const [respondingAddress] = await getPeersAddressFromAppInstanceID(
      requestHandler.publicIdentifier,
      requestHandler.store,
      params.appInstanceId
    );

    const appInstanceInfo = await install(
      store,
      instructionExecutor,
      publicIdentifier,
      respondingAddress,
      params
    );

    const installApprovalMsg: InstallMessage = {
      from: publicIdentifier,
      type: NODE_EVENTS.INSTALL,
      data: { params }
    };

    await messagingService.send(respondingAddress, installApprovalMsg);

    return {
      appInstance: appInstanceInfo
    };
  }
}
