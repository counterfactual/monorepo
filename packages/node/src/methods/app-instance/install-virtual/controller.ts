import { Node } from "@counterfactual/types";
import Queue from "p-queue";

import { RequestHandler } from "../../../request-handler";
import { InstallVirtualMessage, NODE_EVENTS } from "../../../types";
import { hashOfOrderedPublicIdentifiers } from "../../../utils";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";

import { installVirtual } from "./operation";

export default class InstallVirtualController extends NodeController {
  public static readonly methodName = Node.MethodName.INSTALL_VIRTUAL;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.InstallVirtualParams
  ): Promise<Queue[]> {
    const { store } = requestHandler;
    const { appInstanceId } = params;

    const multisigAddress = await store.getMultisigAddressFromOwnersHash(
      hashOfOrderedPublicIdentifiers([
        requestHandler.publicIdentifier,
        params.intermediaries[0]
      ])
    );

    const queues = [requestHandler.getShardedQueue(multisigAddress)];

    try {
      const metachannel = await store.getChannelFromAppInstanceID(
        appInstanceId
      );
      queues.push(requestHandler.getShardedQueue(metachannel.multisigAddress));
    } catch (e) {
      // It is possible the metachannel has never been created
      if (e !== ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID) throw e;
    }

    return queues;
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
