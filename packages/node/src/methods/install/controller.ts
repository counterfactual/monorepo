import { Node } from "@counterfactual/types";

import { NodeMessage } from "../../node";
import { RequestHandler } from "../../request-handler";
import { getPeersAddressFromAppInstanceID } from "../../utils";

import { install } from "./app-instance";

/**
 * This converts a proposed app instance to an installed app instance while
 * sending an approved ack to the proposer.
 * @param params
 */
export default async function installAppInstanceController(
  this: RequestHandler,
  params: Node.InstallParams
): Promise<Node.InstallResult> {
  const appInstance = await install(this.store, params);

  const [peerAddress] = await getPeersAddressFromAppInstanceID(
    this.selfAddress,
    this.store,
    appInstance.id
  );

  const installApprovalMsg: NodeMessage = {
    from: this.selfAddress,
    event: Node.EventName.INSTALL,
    data: {
      appInstanceId: appInstance.id,
      proposal: false
    }
  };

  await this.messagingService.send(peerAddress, installApprovalMsg);
  return {
    appInstance
  };
}
