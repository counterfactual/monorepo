import { uninstallAppInstanceFromChannel } from "../../methods/app-instance/uninstall/operation";
import { RequestHandler } from "../../request-handler";
import { UninstallMessage } from "../../types";

export default async function takeActionEventController(
  requestHandler: RequestHandler,
  nodeMsg: UninstallMessage
) {
  const updatedChannel = await uninstallAppInstanceFromChannel(
    requestHandler.store,
    nodeMsg.data.appInstance.id
  );
  await requestHandler.store.saveStateChannel(updatedChannel);
}
