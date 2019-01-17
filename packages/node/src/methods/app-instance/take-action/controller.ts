import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { ERRORS } from "../../errors";

import { updateAppInstance } from "./operation";

export default async function takeActionController(
  requestHandler: RequestHandler,
  params: Node.TakeActionParams
): Promise<Node.TakeActionResult> {
  if (!params.appInstanceId) {
    return Promise.reject(ERRORS.NO_APP_INSTANCE_FOR_TAKE_ACTION);
  }

  const updatedAppInstance = await updateAppInstance(
    await requestHandler.store.getAppInstanceFromAppInstanceID(
      params.appInstanceId
    ),
    params.action,
    requestHandler.provider
  );

  return {
    newState: updatedAppInstance.state
  };
}
