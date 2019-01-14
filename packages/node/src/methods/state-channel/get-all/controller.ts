import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";

export default async function getAllChannelAddressesController(
  requestHandler: RequestHandler
): Promise<Node.GetChannelAddressesResult> {
  const channels = await requestHandler.store.getAllChannels();
  return {
    multisigAddresses: Object.keys(channels)
  };
}
