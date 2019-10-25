import { Node } from "@counterfactual/types";
import { jsonRpcMethod } from "rpc-server";

import { StateChannelJSON } from "../../../models";
import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";

export default class GetStateChannelController extends NodeController {
  @jsonRpcMethod(Node.RpcMethodName.GET_STATE_CHANNEL)
  public executeMethod = super.executeMethod;

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: { multisigAddress: string }
  ): Promise<{ data: StateChannelJSON }> {
    return {
      data: (await requestHandler.store.getStateChannel(
        params.multisigAddress
      )).toJson()
    };
  }
}
