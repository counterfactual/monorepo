import { Node } from "@counterfactual/types";
import { JsonRpcProvider, TransactionRequest } from "ethers/providers";

import { RequestHandler } from "../../../request-handler";
import { ERRORS } from "../../errors";

import { runWithdrawProtocol } from "./operation";

/**
 * This deposits the specified amount into the multisig of the specified channel.
 */
export default async function withdrawController(
  requestHandler: RequestHandler,
  params: Node.WithdrawParams
): Promise<Node.WithdrawResult> {
  const { store, provider } = requestHandler;
  const { multisigAddress, amount } = params;

  const channel = await store.getStateChannel(multisigAddress);

  if (
    channel.hasAppInstanceOfKind(requestHandler.networkContext.ETHBalanceRefund)
  ) {
    return Promise.reject(ERRORS.CANNOT_WITHDRAW);
  }

  await runWithdrawProtocol(requestHandler, params);

  const {
    to,
    value,
    data
  } = await requestHandler.store.getWithdrawalCommitment(multisigAddress);

  const tx: TransactionRequest = {
    to,
    value,
    data,
    gasPrice: await provider.getGasPrice()
  };

  tx.gasLimit = await provider.estimateGas(tx);

  if (provider instanceof JsonRpcProvider) {
    const signer = await provider.getSigner();
    await signer.sendTransaction(tx);
  } else {
    await requestHandler.wallet.sendTransaction(tx);
  }

  return {
    amount
  };
}
