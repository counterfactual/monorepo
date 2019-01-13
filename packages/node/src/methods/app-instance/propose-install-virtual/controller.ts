import { Node } from "@counterfactual/types";

import { NodeMessage } from "../../../node";
import { RequestHandler } from "../../../request-handler";
import { createProposedAppInstance } from "../propose-install/controller";

/**
 * This creates an entry of a proposed Virtual AppInstance while sending the
 * proposal to the intermediaries and peer with whom this app instance is
 * indicated to be instantiated with.
 * @param params
 * @returns The AppInstanceId for the proposed AppInstance
 */
export default async function proposeInstallVirtualAppInstanceController(
  this: RequestHandler,
  params: Node.ProposeInstallVirtualParams
): Promise<Node.ProposeInstallVirtualResult> {
  if (params.abiEncodings.actionEncoding === undefined) {
    delete params.abiEncodings.actionEncoding;
  }

  const appInstanceId = await createProposedAppInstance(
    this.selfAddress,
    this.store,
    params
  );

  const proposalMsg: NodeMessage = {
    from: this.selfAddress,
    event: Node.EventName.INSTALL,
    data: {
      ...params,
      appInstanceId,
      proposal: true
    }
  };

  await this.messagingService.send(params.respondingAddress, proposalMsg);

  return {
    appInstanceId
  };
}
