import { RequestHandler } from "../../../request-handler";

export async function getAllChannelAddressesController(
  requestHandler: RequestHandler
) {
  return {
    multisigAddresses: Object.keys(await requestHandler.store.getAllChannels())
  };
}
