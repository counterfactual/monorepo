import { Node } from "@counterfactual/types";
import { jsonRpcMethod } from "rpc-server";

import { WithdrawController } from "../..";
import { xkeyKthAddress } from "../../../machine";
import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";
import { runWithdrawProtocol } from "../withdraw/operation";

// Note: This can't extend `WithdrawController` because the `methodName` static
// members of each class are incompatible.
export default class WithdrawCommitmentController extends NodeController {
  @jsonRpcMethod(Node.RpcMethodName.WITHDRAW_COMMITMENT)
  public executeMethod = super.executeMethod;

  protected async getShardKeysForQueueing(
    requestHandler: RequestHandler,
    params: Node.WithdrawCommitmentParams
  ): Promise<string[]> {
    return WithdrawController.getShardKeysForQueueing(requestHandler, params);
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.WithdrawCommitmentParams
  ): Promise<Node.WithdrawCommitmentResult> {
    const { store, publicIdentifier } = requestHandler;

    const { multisigAddress, recipient } = params;

    params.recipient = recipient || xkeyKthAddress(publicIdentifier, 0);

    await runWithdrawProtocol(requestHandler, params);

    const commitment = await store.getWithdrawalCommitment(multisigAddress);

    if (!commitment) {
      throw Error("No withdrawal commitment found");
    }

    return {
      transaction: commitment
    };
  }
}
