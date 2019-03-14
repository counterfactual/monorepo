import { Node } from "@counterfactual/types";
import Queue from "p-queue";

import { RequestHandler } from "../../../request-handler";
import { InstallVirtualMessage, NODE_EVENTS } from "../../../types";
import { NodeController } from "../../controller";

import { installVirtual } from "./operation";

export default class InstallVirtualController extends NodeController {
  public static readonly methodName = Node.MethodName.INSTALL_VIRTUAL;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.InstallVirtualParams
  ): Promise<Queue> {
    const { store } = requestHandler;
    const { appInstanceId } = params;
    return requestHandler.getShardedQueue(
      await store.getMultisigAddressFromAppInstanceID(appInstanceId)
    );
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.InstallVirtualParams
  ): Promise<Node.InstallVirtualResult> {
    const { appInstanceId } = params;

    const proposedAppInstanceInfo = await requestHandler.store.getProposedAppInstanceInfo(
      appInstanceId
    );

    const appInstanceInfo = await installVirtual(
      requestHandler.store,
      requestHandler.instructionExecutor,
      params
    );

    const installVirtualApprovalMsg: InstallVirtualMessage = {
      from: requestHandler.publicIdentifier,
      type: NODE_EVENTS.INSTALL_VIRTUAL,
      data: {
        params: {
          appInstanceId
        }
      }
    };

    await requestHandler.messagingService.send(
      proposedAppInstanceInfo.proposedByIdentifier,
      installVirtualApprovalMsg
    );

    return {
      appInstance: appInstanceInfo
    };
  }
}
