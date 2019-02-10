import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { ERRORS } from "../../errors";

/**
 * Handles the retrieval of an AppInstance.
 * @param this
 * @param params
 */
export default async function getAppInstanceController(
  requestHandler: RequestHandler,
  params: Node.GetAppInstanceDetailsParams
): Promise<Node.GetAppInstanceDetailsResult> {
  const { appInstanceId } = params;

  if (!appInstanceId) {
    Promise.reject(ERRORS.NO_APP_INSTANCE_ID_TO_GET_DETAILS);
  }

  return {
    appInstance: await requestHandler.store.getAppInstanceInfo(appInstanceId)
  };
}
