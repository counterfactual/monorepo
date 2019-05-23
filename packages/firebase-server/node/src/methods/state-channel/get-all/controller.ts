import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";

export default class GetAllChannelAddressesController extends NodeController {
  public static readonly methodName = Node.MethodName.GET_CHANNEL_ADDRESSES;

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.GetChannelAddressesParams
  ): Promise<Node.GetChannelAddressesResult> {
    return {
      multisigAddresses: Object.keys(
        await requestHandler.store.getAllChannels()
      )
    };
  }
}
