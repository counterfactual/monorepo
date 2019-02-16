import { Node } from "@counterfactual/types";
import { JsonRpcProvider } from "ethers/providers";

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
  const { store } = requestHandler;
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

  const tx = {
    to,
    value,
    data,
    gasLimit: 300000, // TODO: Estimate correct value,
    gasPrice: await requestHandler.provider.getGasPrice()
  };

  if (requestHandler.provider instanceof JsonRpcProvider) {
    const signer = await requestHandler.provider.getSigner();
    await signer.sendTransaction(tx);
  } else {
    await requestHandler.wallet.sendTransaction(tx);
  }

  return {
    amount
  };
}
