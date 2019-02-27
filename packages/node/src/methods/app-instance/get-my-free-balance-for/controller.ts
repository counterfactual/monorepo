import { AssetType, Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";

/**
 * Handles the retrieval of a Channel's FreeBalance AppInstance.
 * @param this
 * @param params
 */
export default class GetMyFreeBalanceForController extends NodeController {
  public static readonly methodName =
    Node.MethodName.GET_MY_FREE_BALANCE_FOR_STATE;

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.GetMyFreeBalanceForStateParams
  ): Promise<Node.GetMyFreeBalanceForStateResult> {
    const { store } = requestHandler;
    const { multisigAddress } = params;

    if (!multisigAddress) {
      Promise.reject(ERRORS.NO_STATE_CHANNEL_FOR_MULTISIG_ADDR);
    }

    const stateChannel = await store.getStateChannel(multisigAddress);

    return {
      balance: stateChannel.getFreeBalanceValueOf(
        requestHandler.publicIdentifier,
        AssetType.ETH
      )
    };
  }
}
