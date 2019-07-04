import { Node } from "@counterfactual/types";
import { jsonRpcMethod } from "rpc-server";

import { getETHFreeBalance } from "../../../models/free-balance";
import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";
import { NO_STATE_CHANNEL_FOR_MULTISIG_ADDR } from "../../errors";

/**
 * Handles the retrieval of a Channel's FreeBalance AppInstance.
 * @param this
 * @param params
 */
export default class GetFreeBalanceController extends NodeController {
  public static readonly methodName = Node.MethodName.GET_FREE_BALANCE_STATE;

  @jsonRpcMethod("chan_getFreeBalanceState")
  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.GetFreeBalanceStateParams
  ): Promise<Node.GetFreeBalanceStateResult> {
    const { store } = requestHandler;
    const { multisigAddress } = params;

    if (!multisigAddress) {
      Promise.reject(NO_STATE_CHANNEL_FOR_MULTISIG_ADDR);
    }

    const stateChannel = await store.getStateChannel(multisigAddress);

    return getETHFreeBalance(stateChannel.freeBalance);
  }
}
