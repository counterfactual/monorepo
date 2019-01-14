import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { InstallMessage, NODE_EVENTS } from "../../../types";
import { getPeersAddressFromAppInstanceID } from "../../../utils";

import { install } from "./operation";

/**
 * This converts a proposed app instance to an installed app instance while
 * sending an approved ack to the proposer.
 * @param params
 */
export default async function installAppInstanceController(
  requestHandler: RequestHandler,
  params: Node.InstallParams
): Promise<Node.InstallResult> {
  const [respondingAddress] = await getPeersAddressFromAppInstanceID(
    requestHandler.address,
    requestHandler.store,
    params.appInstanceId
  );

  const appInstanceInfo = await install(
    requestHandler.store,
    requestHandler.instructionExecutor,
    requestHandler.address,
    respondingAddress,
    params
  );

  const installApprovalMsg: InstallMessage = {
    from: requestHandler.address,
    event: NODE_EVENTS.INSTALL,
    data: {
      params: {
        appInstanceId: appInstanceInfo.id
      }
    }
  };

  await requestHandler.messagingService.send(
    respondingAddress,
    installApprovalMsg
  );
  return {
    appInstance: appInstanceInfo
  };
}
