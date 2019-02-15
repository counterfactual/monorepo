import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, UninstallMessage } from "../../../types";
import { getCounterpartyAddress } from "../../../utils";
import { ERRORS } from "../../errors";

import { uninstallAppInstanceFromChannel } from "./operation";

export default async function uninstallController(
  requestHandler: RequestHandler,
  params: Node.UninstallParams
): Promise<Node.UninstallResult> {
  const { appInstanceId } = params;

  if (!appInstanceId) {
    return Promise.reject(ERRORS.NO_APP_INSTANCE_ID_TO_UNINSTALL);
  }

  const stateChannel = await requestHandler.store.getChannelFromAppInstanceID(
    appInstanceId
  );

  const to = getCounterpartyAddress(
    requestHandler.publicIdentifier,
    stateChannel.userNeuteredExtendedKeys
  );

  await uninstallAppInstanceFromChannel(
    requestHandler.store,
    requestHandler.instructionExecutor,
    requestHandler.publicIdentifier,
    to,
    appInstanceId
  );

  const uninstallMsg: UninstallMessage = {
    from: requestHandler.publicIdentifier,
    type: NODE_EVENTS.UNINSTALL,
    data: {
      appInstanceId
    }
  };

  await requestHandler.messagingService.send(to, uninstallMsg);

  return {};
}
