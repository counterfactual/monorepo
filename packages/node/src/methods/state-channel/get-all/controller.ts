import { RequestHandler } from "../../../request-handler";

export default async function getAllChannelAddressesController(
  requestHandler: RequestHandler
) {
  return {
    multisigAddresses: Object.keys(await requestHandler.store.getAllChannels())
  };
}
