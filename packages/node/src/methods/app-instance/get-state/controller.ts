import { Node } from "@counterfactual/types";
import { jsonRpcMethod } from "rpc-server";

import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";
import { NO_APP_INSTANCE_ID_FOR_GET_STATE } from "../../errors";

/**
 * Handles the retrieval of an AppInstance's state.
 * @param this
 * @param params
 */
export default class GetStateController extends NodeController {
  public readonly methodName = Node.RpcMethodName.GET_STATE_CHANNEL;
  public static readonly methodName = Node.RpcMethodName.GET_STATE;

  @jsonRpcMethod(Node.RpcMethodName.GET_STATE)
  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.GetStateParams
  ): Promise<Node.GetStateResult> {
    const { store } = requestHandler;
    const { appInstanceId } = params;

    if (!appInstanceId) {
      throw Error(NO_APP_INSTANCE_ID_FOR_GET_STATE);
    }

    const appInstance = await store.getAppInstance(appInstanceId);

    return {
      state: appInstance.state
    };
  }
}
