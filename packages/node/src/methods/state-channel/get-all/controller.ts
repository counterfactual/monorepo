import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";

export default async function getAllChannelAddressesController(
  this: RequestHandler
): Promise<Node.GetChannelAddressesResult> {
  const channels = await this.store.getAllChannels();
  return {
    multisigAddresses: Object.keys(channels)
  };
}
