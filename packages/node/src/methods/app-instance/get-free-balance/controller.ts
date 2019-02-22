import { AssetType, Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";

/**
 * Handles the retrieval of a Channel's FreeBalance AppInstance.
 * @param this
 * @param params
 */
export default class GetFreeBalanceController extends NodeController {
  public static readonly methodName = Node.MethodName.GET_FREE_BALANCE_STATE;

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.GetFreeBalanceStateParams
  ): Promise<Node.GetFreeBalanceStateResult> {
    const { store } = requestHandler;
    const { multisigAddress } = params;

    if (!multisigAddress) {
      Promise.reject(ERRORS.NO_STATE_CHANNEL_FOR_MULTISIG_ADDR);
    }

    const stateChannel = await store.getStateChannel(multisigAddress);

    return {
      state: stateChannel.getFreeBalanceFor(AssetType.ETH).state
    };
  }
}
