import { Node } from "@counterfactual/types";

import { NodeMessage } from "../../../node";
import { RequestHandler } from "../../../request-handler";
import { getPeersAddressFromAppInstanceID } from "../../../utils";

import { install } from "./operation";

/**
 * This converts a proposed app instance to an installed app instance while
 * sending an approved ack to the proposer.
 * @param params
 */
export default async function installAppInstanceController(
  this: RequestHandler,
  params: Node.InstallParams
): Promise<Node.InstallResult> {
  const [respondingAddress] = await getPeersAddressFromAppInstanceID(
    this.selfAddress,
    this.store,
    params.appInstanceId
  );

  const appInstance = await install(
    this.store,
    this.instructionExecutor,
    this.selfAddress,
    respondingAddress,
    params
  );

  const installApprovalMsg: NodeMessage = {
    from: this.selfAddress,
    event: Node.EventName.INSTALL,
    data: {
      appInstanceId: appInstance.id,
      proposal: false
    }
  };

  await this.messagingService.send(respondingAddress, installApprovalMsg);
  return {
    appInstance
  };
}
