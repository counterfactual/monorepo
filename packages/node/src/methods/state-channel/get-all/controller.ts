import { Node } from "@counterfactual/types";

import { StateChannel } from "../../../models";
import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";

export default class GetStateChannelController extends NodeController {
  public static readonly methodName = Node.MethodName.GET_STATE_CHANNEL;

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: { multisigAddress: string }
  ): Promise<{ data: StateChannel }> {
    return {
      data: await requestHandler.store.getStateChannel(params.multisigAddress)
    };
  }
}
