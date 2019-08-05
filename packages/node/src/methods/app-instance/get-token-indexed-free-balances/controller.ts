import { Node } from "@counterfactual/types";
import { jsonRpcMethod } from "rpc-server";

import {
  convertCoinTransfersToCoinTransfersMap,
  deserializeFreeBalanceState,
  FreeBalanceStateJSON
} from "../../../models/free-balance";
import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";

export default class GetTokenIndexedFreeBalancesController extends NodeController {
  public static readonly methodName =
    Node.MethodName.GET_TOKEN_INDEXED_FREE_BALANCE_STATES;

  @jsonRpcMethod("chan_getTokenIndexedFreeBalanceStates")
  public executeMethod = super.executeMethod;

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.GetTokenIndexedFreeBalanceStatesParams
  ): Promise<Node.GetTokenIndexedFreeBalanceStatesResult> {
    const { store } = requestHandler;
    const { multisigAddress } = params;

    if (!multisigAddress) {
      throw new Error(
        "getTokenIndexedFreeBalanceStates method was given undefined multisigAddress"
      );
    }

    const stateChannel = await store.getStateChannel(multisigAddress);

    const tokenIndexedFreeBalances = deserializeFreeBalanceState(stateChannel
      .freeBalance.state as FreeBalanceStateJSON).balancesIndexedByToken;

    return Object.entries(tokenIndexedFreeBalances).reduce(
      (accumulator, tokenIndexedFreeBalance) => ({
        ...accumulator,
        [tokenIndexedFreeBalance[0]]: convertCoinTransfersToCoinTransfersMap(
          tokenIndexedFreeBalance[1]
        )
      }),
      {}
    );
  }
}
