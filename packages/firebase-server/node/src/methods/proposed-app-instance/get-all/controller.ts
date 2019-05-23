import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";

export default class GetProposedAppInstancesController extends NodeController {
  public static readonly methodName =
    Node.MethodName.GET_PROPOSED_APP_INSTANCES;

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.GetProposedAppInstancesParams
  ): Promise<Node.GetProposedAppInstancesResult> {
    return {
      appInstances: await requestHandler.store.getProposedAppInstances()
    };
  }
}
