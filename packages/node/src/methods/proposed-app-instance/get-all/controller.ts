import { Node } from "@counterfactual/types";
import { jsonRpcMethod } from "rpc-server";

import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";

export default class GetProposedAppInstancesController extends NodeController {
  public readonly methodName = Node.RpcMethodName.GET_PROPOSED_APP_INSTANCES;
  public static readonly methodName =
    Node.RpcMethodName.GET_PROPOSED_APP_INSTANCES;

  @jsonRpcMethod(Node.RpcMethodName.GET_PROPOSED_APP_INSTANCES)
  protected async executeMethodImplementation(
    requestHandler: RequestHandler
  ): Promise<Node.GetProposedAppInstancesResult> {
    return {
      appInstances: await requestHandler.store.getProposedAppInstances()
    };
  }
}
