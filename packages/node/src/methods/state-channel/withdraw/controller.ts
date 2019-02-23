import { Node } from "@counterfactual/types";
import { JsonRpcProvider } from "ethers/providers";
import Queue from "p-queue";

import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";

import { runWithdrawProtocol } from "./operation";

export default class WithdrawController extends NodeController {
  public static readonly methodName = Node.MethodName.WITHDRAW;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.DepositParams
  ): Promise<Queue> {
    return requestHandler.getShardedQueue(params.multisigAddress);
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.WithdrawParams
  ): Promise<Node.WithdrawResult> {
    const { store, provider, networkContext, wallet } = requestHandler;
    const { multisigAddress, amount } = params;

    const channel = await store.getStateChannel(multisigAddress);

    if (channel.hasAppInstanceOfKind(networkContext.ETHBalanceRefund)) {
      return Promise.reject(ERRORS.CANNOT_WITHDRAW);
    }

    await runWithdrawProtocol(requestHandler, params);

    const commitment = await store.getWithdrawalCommitment(multisigAddress);

    const tx = {
      ...commitment,
      gasPrice: await provider.getGasPrice(),
      gasLimit: 300000
    };

    if (provider instanceof JsonRpcProvider) {
      await provider.getSigner().sendTransaction(tx);
    } else {
      await wallet.sendTransaction(tx);
    }

    return {
      amount
    };
  }
}
