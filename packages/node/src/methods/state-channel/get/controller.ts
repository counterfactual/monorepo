import { Node } from "@counterfactual/types";
import { jsonRpcMethod } from "rpc-server";

import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";

export default class GetAllChannelAddressesController extends NodeController {
  @jsonRpcMethod(Node.RpcMethodName.GET_STATE_CHANNEL)
  public executeMethod = super.executeMethod;

  protected async executeMethodImplementation(
    requestHandler: RequestHandler
  ): Promise<Node.GetChannelAddressesResult> {
    return {
      multisigAddresses: [
        ...(await requestHandler.store.getStateChannelsMap()).keys()
      ]
    };
  }
}
