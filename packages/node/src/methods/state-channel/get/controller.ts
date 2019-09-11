import { Node } from "@counterfactual/types";
import { jsonRpcMethod } from "rpc-server";

import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";

export default class GetAllChannelAddressesController extends NodeController {
  public readonly methodName = Node.RpcMethodName.GET_CHANNEL_ADDRESSES;
  public static readonly methodName = Node.RpcMethodName.GET_CHANNEL_ADDRESSES;

  @jsonRpcMethod(Node.RpcMethodName.GET_CHANNEL_ADDRESSES)
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
