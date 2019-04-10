import { Node } from "@counterfactual/types";
import { JsonRpcProvider, TransactionResponse } from "ethers/providers";
import Queue from "p-queue";

import { xkeyKthAddress } from "../../../machine";
import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS } from "../../../types";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";

import { runWithdrawProtocol } from "./operation";

export default class WithdrawController extends NodeController {
  public static readonly methodName = Node.MethodName.WITHDRAW;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.DepositParams
  ): Promise<Queue[]> {
    return [requestHandler.getShardedQueue(params.multisigAddress)];
  }

  protected async beforeExecution(
    requestHandler: RequestHandler,
    params: Node.DepositParams
  ): Promise<void> {
    const { store, networkContext } = requestHandler;
    const { multisigAddress } = params;

    const channel = await store.getStateChannel(multisigAddress);

    if (channel.hasAppInstanceOfKind(networkContext.ETHBalanceRefundApp)) {
      return Promise.reject(ERRORS.CANNOT_WITHDRAW);
    }
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.WithdrawParams
  ): Promise<Node.WithdrawResult> {
    const {
      store,
      provider,
      wallet,
      publicIdentifier,
      blocksNeededForConfirmation
    } = requestHandler;
    const { multisigAddress, amount, recipient } = params;

    params.recipient = recipient || xkeyKthAddress(publicIdentifier, 0);

    await runWithdrawProtocol(requestHandler, params);

    const commitment = await store.getWithdrawalCommitment(multisigAddress);

    if (!commitment) {
      throw Error("no commitment found");
    }

    const tx = {
      ...commitment,
      gasPrice: await provider.getGasPrice(),
      gasLimit: 300000
    };

    try {
      let txResponse: TransactionResponse;

      if (provider instanceof JsonRpcProvider) {
        const signer = await provider.getSigner();
        txResponse = await signer.sendTransaction(tx);
      } else {
        txResponse = await wallet.sendTransaction(tx);
      }

      requestHandler.outgoing.emit(NODE_EVENTS.WITHDRAWAL_STARTED, {
        value: amount,
        txHash: txResponse.hash
      });

      await provider.waitForTransaction(
        txResponse.hash as string,
        blocksNeededForConfirmation
      );
    } catch (e) {
      requestHandler.outgoing.emit(NODE_EVENTS.WITHDRAWAL_FAILED, e);
      throw new Error(`${ERRORS.WITHDRAWAL_FAILED}: ${e}`);
    }

    return {
      amount,
      recipient: params.recipient
    };
  }
}
