import { Node } from "@counterfactual/types";
import { jsonRpcMethod } from "rpc-server";

import {
  ETH_FREE_BALANCE_ADDRESS,
  FreeBalanceState
} from "../../../models/free-balance";
import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";
import {
  NO_FREE_BALANCE_FOR_ERC20,
  NO_STATE_CHANNEL_FOR_MULTISIG_ADDR
} from "../../errors";

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
    const { multisigAddress, tokenAddress } = params;

    if (!multisigAddress) {
      Promise.reject(NO_STATE_CHANNEL_FOR_MULTISIG_ADDR);
    }

    const stateChannel = await store.getStateChannel(multisigAddress);

    const appState = stateChannel.freeBalance.state as FreeBalanceState;
    if (!tokenAddress) {
      return appState[ETH_FREE_BALANCE_ADDRESS];
    }
    if (appState[tokenAddress] === undefined) {
      return Promise.reject(NO_FREE_BALANCE_FOR_ERC20(tokenAddress));
    }

    return appState[tokenAddress];
  }
}
