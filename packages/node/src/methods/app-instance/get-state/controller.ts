import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";

import { getAppInstanceState } from "./operation";

/**
 * Handles the retrieval of an AppInstance's state.
 * @param this
 * @param params
 */
export default class GetStateController extends NodeController {
  public static readonly methodName = Node.MethodName.GET_STATE;

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.GetStateParams
  ): Promise<Node.GetStateResult> {
    const { store } = requestHandler;
    const { appInstanceId } = params;

    if (!appInstanceId) {
      Promise.reject(ERRORS.NO_APP_INSTANCE_ID_FOR_GET_STATE);
    }

    return {
      state: await getAppInstanceState(appInstanceId, store)
    };
  }
}
