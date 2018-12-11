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

  const peerAddresses = await channels.getPeersAddressFromAppInstanceId(
    appInstanceId
  );

  const installApprovalMsg: NodeMessage = {
    from: channels.selfAddress,
    event: Node.EventName.INSTALL,
    data: {
      appInstanceId,
      proposal: false
    }
  };

  await messagingService.send(peerAddresses[0], installApprovalMsg);
  return {
    appInstance
  };
}

/**
 * This function adds the app instance as a pending installation if the proposal
 * flag is set. Otherwise it adds the app instance as an installed app into the
 * appropriate channel.
 * @param channels
 * @param messagingService
 * @param params
 */
export async function addAppInstance(
  channels: Channels,
  messagingService: IMessagingService,
  nodeMsg: NodeMessage
) {
  const params = { ...nodeMsg.data };
  params.peerAddress = nodeMsg.from!;
  delete params.proposal;
  if (nodeMsg.data.proposal) {
    delete params.appInstanceId;
    await channels.proposeInstall(params);
  } else {
    await channels.install(params);
  }
}
