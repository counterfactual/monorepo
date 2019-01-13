import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { ERRORS } from "../../errors";

import { getAppInstanceState } from "./operation";

/**
 * Handles the retrieval of an AppInstance's state.
 * @param this
 * @param params
 */
export default async function getAppInstanceStateController(
  requestHandler: RequestHandler,
  params: Node.GetStateParams
): Promise<Node.GetStateResult> {
  if (!params.appInstanceId) {
    Promise.reject(ERRORS.NO_APP_INSTANCE_ID_FOR_GET_STATE);
  }
  return {
    state: await getAppInstanceState(params.appInstanceId, requestHandler.store)
  };
}
