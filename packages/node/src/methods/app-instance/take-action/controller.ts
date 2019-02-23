import { Node } from "@counterfactual/types";
import Queue from "p-queue";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, UpdateStateMessage } from "../../../types";
import { getCounterpartyAddress } from "../../../utils";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";

import { actionIsEncondable, generateNewAppInstanceState } from "./operation";

export default class TakeActionController extends NodeController {
  public static readonly methodName = Node.MethodName.TAKE_ACTION;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.TakeActionParams
  ): Promise<Queue> {
    const { store } = requestHandler;
    const { appInstanceId } = params;

    return requestHandler.getShardedQueue(
      await store.getMultisigAddressFromAppInstanceID(appInstanceId)
    );
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.TakeActionParams
  ): Promise<Node.TakeActionResult> {
    const { appInstanceId, action } = params;

    if (!appInstanceId) {
      return Promise.reject(ERRORS.NO_APP_INSTANCE_FOR_TAKE_ACTION);
    }

    const appInstance = await requestHandler.store.getAppInstanceFromAppInstanceID(
      appInstanceId
    );

    const oldState = appInstance.state;

    try {
      await actionIsEncondable(appInstance, action);
    } catch (e) {
      return Promise.reject(e);
    }

    const newState = await generateNewAppInstanceState(
      appInstance,
      action,
      requestHandler.provider
    );

    await requestHandler.store.saveAppInstanceState(appInstanceId, newState);

    const updateStateMessage: UpdateStateMessage = {
      from: requestHandler.publicIdentifier,
      type: NODE_EVENTS.UPDATE_STATE,
      data: {
        appInstanceId,
        newState,
        oldState,
        action: params.action
      }
    };

    const appInstanceInfo = await requestHandler.store.getAppInstanceInfo(
      appInstanceId
    );

    const to = getCounterpartyAddress(requestHandler.publicIdentifier, [
      appInstanceInfo.proposedByIdentifier,
      appInstanceInfo.proposedToIdentifier
    ]);

    await requestHandler.messagingService.send(to, updateStateMessage);

    return {
      newState
    };
  }
}
