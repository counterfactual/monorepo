import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { ERRORS } from "../../errors";

import {
  installBalanceRefundApp,
  makeDeposit,
  uninstallBalanceRefundApp
} from "./operation";

/**
 * This deposits the specified amount into the multisig of the specified channel.
 */
export default async function depositController(
  requestHandler: RequestHandler,
  params: Node.DepositParams
): Promise<Node.DepositResult> {
  const { store } = requestHandler;
  const channel = await store.getStateChannel(params.multisigAddress);

  if (
    channel.hasAppInstanceOfKind(requestHandler.networkContext.ETHBalanceRefund)
  ) {
    return Promise.reject(ERRORS.CANNOT_DEPOSIT);
  }

  await installBalanceRefundApp(requestHandler, params);

  await makeDeposit(requestHandler, params);

  await uninstallBalanceRefundApp(requestHandler, params);

  return {
    multisigBalance: await requestHandler.provider.getBalance(
      params.multisigAddress
    )
  };
}
