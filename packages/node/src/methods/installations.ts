import { Node } from "@counterfactual/common-types";

import { Channels } from "../channels";
import { NodeMessage } from "../node";
import { IMessagingService } from "../service-interfaces";

export async function proposeInstall(
  channels: Channels,
  messagingService: IMessagingService,
  params: Node.ProposeInstallParams
): Promise<Node.ProposeInstallResult> {
  const appInstanceId = await channels.proposeInstall(params);

  const proposalMsg: NodeMessage = {
    from: channels.selfAddress,
    event: Node.EventName.INSTALL,
    data: {
      ...params,
      appInstanceId,
      proposal: true
    }
  };

  await messagingService.send(params.peerAddress, proposalMsg);

  return {
    appInstanceId
  };
}

export async function install(
  channels: Channels,
  messagingService: IMessagingService,
  params: Node.InstallParams
): Promise<Node.InstallResult> {
  const appInstance = await channels.install(params);
  const appInstanceId = appInstance.id;

  const peerAddress = await channels.getPeersAddressFromAppInstanceId(
    appInstanceId
  )[0];

  const installApprovalMsg: NodeMessage = {
    from: channels.selfAddress,
    event: Node.EventName.INSTALL,
    data: {
      appInstanceId,
      proposal: false
    }
  };

  await messagingService.send(peerAddress, installApprovalMsg);
  return {
    appInstance
  };
}

/**
 * This function is different from `proposeInstall` as it's only adding the
 * pending app instance to the relevant channel on the receiving party's end,
 * hence no proposal is being made to any peers.
 * @param channels
 * @param messagingService
 * @param params
 */
export async function addPendingAppInstance(
  channels: Channels,
  messagingService: IMessagingService,
  nodeMsg: NodeMessage
): Promise<Node.ProposeInstallResult> {
  const params: Node.ProposeInstallParams = nodeMsg.data;
  params.peerAddress = nodeMsg.from!;
  return {
    appInstanceId: await channels.proposeInstall(params)
  };
}
