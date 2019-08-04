import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";

export default class GetAllChannelAddressesController extends NodeController {
  public static readonly methodName = Node.MethodName.GET_CHANNEL_ADDRESSES;

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
