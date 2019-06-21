import { ETHBucketAppState, Node } from "@counterfactual/types";
import { bigNumberify } from "ethers/utils";
import { jsonRpcMethod } from "rpc-server";

import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";

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
      throw new Error(
        "chan_getFreeBalanceState: received undefined multisigAddress"
      );
    }

    const stateChannel = await store.getStateChannel(multisigAddress);

    const appState = stateChannel.freeBalance.state as ETHBucketAppState;

    const ret: Node.GetFreeBalanceStateResult = {};

    for (const { amount, to } of appState[0]) {
      ret[to] = bigNumberify(amount._hex);
    }

    return ret;
  }
}
