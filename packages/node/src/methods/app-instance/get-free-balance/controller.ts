import { ETHBucketAppState, Node } from "@counterfactual/types";
import { bigNumberify } from "ethers/utils";

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

    const appState = stateChannel.getETHFreeBalance()
      .state as ETHBucketAppState;

    const ret: Node.GetFreeBalanceStateResult = {};

    for (const { amount, to } of appState) {
      ret[to] = bigNumberify(amount._hex);
    }

    return ret;
  }
}
