import { Node } from "@counterfactual/types";

import { StateChannel } from "../../../models";
import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";
import { jsonRpcMethod } from "rpc-server";

export default class GetStateChannelController extends NodeController {
  @jsonRpcMethod(Node.RpcMethodName.GET_CHANNEL_ADDRESSES)
  public executeMethod = super.executeMethod;

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: { multisigAddress: string }
  ): Promise<{ data: StateChannel }> {
    return {
      data: await requestHandler.store.getStateChannel(params.multisigAddress)
    };
  }
}
