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
  const { store, provider, networkContext, wallet } = requestHandler;
  const { multisigAddress, amount } = params;

  const channel = await store.getStateChannel(multisigAddress);

  if (channel.hasAppInstanceOfKind(networkContext.ETHBalanceRefund)) {
    return Promise.reject(ERRORS.CANNOT_WITHDRAW);
  }

  await runWithdrawProtocol(requestHandler, params);

  const commitment = await store.getWithdrawalCommitment(multisigAddress);

  const tx = {
    ...(await store.getWithdrawalCommitment(multisigAddress)),
    gasPrice: await provider.getGasPrice(),
    gasLimit: await provider.estimateGas(commitment)
  };

  if (provider instanceof JsonRpcProvider) {
    const signer = await provider.getSigner();
    await signer.sendTransaction(tx);
  } else {
    await wallet.sendTransaction(tx);
  }

  return {
    amount
  };
}
