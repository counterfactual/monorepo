import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";

/**
 * This deposits the specified amount into the multisig of the specified channel.
 */
export default async function createChannelController(
  requestHandler: RequestHandler,
  params: Node.DepositParams
): Promise<Node.DepositResult> {
  const { store } = requestHandler;
  const channel = await store.getStateChannel(params.multisigAddress);
}
