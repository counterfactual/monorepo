import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { NodeMessage } from "../../../types";
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
    this.address,
    this.store,
    params.appInstanceId
  );

  const appInstance = await install(
    this.store,
    this.instructionExecutor,
    this.address,
    respondingAddress,
    params
  );

  const installApprovalMsg: NodeMessage = {
    from: this.address,
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
