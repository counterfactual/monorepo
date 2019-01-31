import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, UninstallMessage } from "../../../types";
import { getCounterpartyAddress } from "../../../utils";
import { ERRORS } from "../../errors";

export default async function takeActionController(
  requestHandler: RequestHandler,
  params: Node.UninstallParams
): Promise<Node.UninstallResult> {
  const { appInstanceId } = params;
  if (!appInstanceId) {
    return Promise.reject(ERRORS.NO_APP_INSTANCE_ID_TO_UNINSTALL);
  }

  // TODO: this should actually call resolve on the AppInstance and execute
  // the appropriate payout to the right parties
  const channel = await requestHandler.store.getChannelFromAppInstanceID(
    appInstanceId
  );

  const appInstanceInfo = await requestHandler.store.getAppInstanceInfo(
    appInstanceId
  );

  const updatedChannel = channel.uninstallApp(
    await requestHandler.store.getAppInstanceIdentityHashFromAppInstanceId(
      appInstanceId
    ),
    appInstanceInfo.myDeposit,
    appInstanceInfo.peerDeposit
  );

  const uninstallMsg: UninstallMessage = {
    from: requestHandler.address,
    type: NODE_EVENTS.UNINSTALL,
    data: {
      appInstance: appInstanceInfo
    }
  };

  // TODO: the next two statements should be synchronized so that the other party
  // receives an uninstall message iff the uninstall initiator can successfully
  // uninstall the AppInstance
  await requestHandler.store.saveStateChannel(updatedChannel);

  const to = getCounterpartyAddress(requestHandler.address, [
    appInstanceInfo.initiatingAddress,
    appInstanceInfo.respondingAddress
  ]);

  await requestHandler.messagingService.send(to, uninstallMsg);
  return {};
}
