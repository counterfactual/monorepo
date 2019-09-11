import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";

export default class GetProposedAppInstanceController extends NodeController {
  public readonly methodName = Node.RpcMethodName.GET_PROPOSED_APP_INSTANCE;
  public static readonly methodName =
    Node.RpcMethodName.GET_PROPOSED_APP_INSTANCE;

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.GetProposedAppInstanceParams
  ): Promise<Node.GetProposedAppInstanceResult> {
    return {
      appInstance: await requestHandler.store.getAppInstanceProposal(
        params.appInstanceId
      )
    };
  }
}
