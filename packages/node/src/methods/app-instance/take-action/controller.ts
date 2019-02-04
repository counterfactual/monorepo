import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, UpdateStateMessage } from "../../../types";
import { getCounterpartyAddress } from "../../../utils";
import { ERRORS } from "../../errors";

import { actionIsEncondable, generateNewAppInstanceState } from "./operation";

export default async function takeActionController(
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
    appInstanceInfo.initiatingAddress,
    appInstanceInfo.respondingAddress
  ]);

  await requestHandler.messagingService.send(to, updateStateMessage);

  return {
    newState
  };
}
