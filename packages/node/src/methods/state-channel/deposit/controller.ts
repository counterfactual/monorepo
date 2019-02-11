import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { ERRORS } from "../../errors";

/**
 * This deposits the specified amount into the multisig of the specified channel.
 */
export default async function depositController(
  requestHandler: RequestHandler,
  params: Node.DepositParams
): Promise<Node.DepositResult> {
  const { store } = requestHandler;
  const channel = await store.getStateChannel(params.multisigAddress);

  if (channel.hasBalanceRefund(requestHandler.networkContext)) {
    return Promise.reject(ERRORS.CANNOT_DEPOSIT);
  }
}
