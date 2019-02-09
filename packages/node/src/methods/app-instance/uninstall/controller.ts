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

  const appInstanceInfo = await requestHandler.store.getAppInstanceInfo(
    appInstanceId
  );
  const updatedChannel = await uninstallAppInstanceFromChannel(
    requestHandler.store,
    appInstanceId
  );

  const uninstallMsg: UninstallMessage = {
    from: requestHandler.publicIdentifier,
    type: NODE_EVENTS.UNINSTALL,
    data: {
      appInstance: appInstanceInfo
    }
  };

  // TODO: the next two statements should be synchronized so that the other party
  // receives an uninstall message iff the uninstall initiator can successfully
  // uninstall the AppInstance
  await requestHandler.store.saveStateChannel(updatedChannel);

  const to = getCounterpartyAddress(requestHandler.publicIdentifier, [
    appInstanceInfo.proposedByIdentifier,
    appInstanceInfo.proposedToIdentifier
  ]);

  await requestHandler.messagingService.send(to, uninstallMsg);

  return {};
}
