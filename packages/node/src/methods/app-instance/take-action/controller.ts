import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, TakeActionMessage } from "../../../types";
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

  const takeActionMsg: TakeActionMessage = {
    from: requestHandler.address,
    event: NODE_EVENTS.TAKE_ACTION,
    data: {
      appInstanceId,
      params: {
        newState
      }
    }
  };

  const appInstanceInfo = await requestHandler.store.getAppInstanceInfo(
    appInstanceId
  );

  // send to the counter party
  const to =
    requestHandler.address === appInstanceInfo.initiatingAddress
      ? appInstanceInfo.respondingAddress
      : requestHandler.address;

  await requestHandler.messagingService.send(to, takeActionMsg);

  return {
    newState
  };
}
