import { Node } from "@counterfactual/types";
import { jsonRpcMethod } from "rpc-server";

import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";

export default class GetTokenIndexedFreeBalancesController extends NodeController {
  public readonly methodName =
    Node.RpcMethodName.GET_TOKEN_INDEXED_FREE_BALANCE_STATES;
  public static readonly methodName =
    Node.RpcMethodName.GET_TOKEN_INDEXED_FREE_BALANCE_STATES;

  @jsonRpcMethod(Node.RpcMethodName.GET_TOKEN_INDEXED_FREE_BALANCE_STATES)
  public executeMethod = super.executeMethod;

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.GetTokenIndexedFreeBalanceStatesParams
  ): Promise<Node.GetTokenIndexedFreeBalanceStatesResult> {
    const { store } = requestHandler;
    const { multisigAddress } = params;

    if (!multisigAddress) {
      throw Error(
        "getTokenIndexedFreeBalanceStates method was given undefined multisigAddress"
      );
    }

    const stateChannel = await store.getStateChannel(multisigAddress);

    return stateChannel.getFreeBalanceClass().toTokenIndexedCoinTransferMap();
  }
}
