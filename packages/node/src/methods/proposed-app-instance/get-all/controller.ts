import { Node } from "@counterfactual/types";
import { jsonRpcMethod } from "rpc-server";

import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";

export default class GetProposedAppInstancesController extends NodeController {
  public static readonly methodName =
    Node.MethodName.GET_PROPOSED_APP_INSTANCES;

  @jsonRpcMethod("chan_getProposedAppInstances")
  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.GetProposedAppInstancesParams
  ): Promise<Node.GetProposedAppInstancesResult> {
    return {
      appInstances: await requestHandler.store.getProposedAppInstances()
    };
  }
}
