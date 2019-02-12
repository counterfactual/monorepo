import { AssetType, Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { ERRORS } from "../../errors";

/**
 * Handles the retrieval of a Channel's FreeBalance AppInstance.
 * @param this
 * @param params
 */
export default async function getAppInstanceController(
  requestHandler: RequestHandler,
  params: Node.GetFreeBalanceStateParams
): Promise<Node.GetFreeBalanceStateResult> {
  const { multisigAddress } = params;

  if (!multisigAddress) {
    Promise.reject(ERRORS.NO_STATE_CHANNEL_FOR_MULTISIG_ADDR);
  }

  return {
    state: (await requestHandler.store.getStateChannel(
      multisigAddress
    )).getFreeBalanceFor(AssetType.ETH).state
  };
}
