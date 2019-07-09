import { Node } from "@counterfactual/types";
import { jsonRpcMethod } from "rpc-server";

import {
  CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  convertFreeBalanceStateFromSerializableObject,
  convertPartyBalancesToMap,
  HexFreeBalanceState
} from "../../../models/free-balance";
import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";
import {
  NO_FREE_BALANCE_EXISTS,
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
      throw new Error(`${NO_STATE_CHANNEL_FOR_MULTISIG_ADDR}`);
    }

    const tokenAddr = tokenAddress
      ? tokenAddress
      : CONVENTION_FOR_ETH_TOKEN_ADDRESS;

    const stateChannel = await store.getStateChannel(multisigAddress);

    const freeBalanceState = convertFreeBalanceStateFromSerializableObject(
      (stateChannel.freeBalance.state as unknown) as HexFreeBalanceState
    );

    if (tokenAddr in freeBalanceState) {
      return convertPartyBalancesToMap(freeBalanceState[tokenAddr]);
    }

    return Promise.reject(NO_FREE_BALANCE_EXISTS(tokenAddr));
  }
}
