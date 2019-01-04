import { Node } from "@counterfactual/types";

import { Channels } from "../channels";
import { NodeMessage } from "../node";
import { IMessagingService } from "../services";

/**
 * This creates an entry of a proposed app instance into the relevant channel
 * while sending the proposal to the peer with whom this app instance is
 * indicated to be instantiated with.
 * @param channels
 * @param messagingService
 * @param params
 * @returns A UUID for the proposed AppInstance, effectively the AppInstanceID
 *          for the client
 */
export async function proposeInstall(
  channels: Channels,
  messagingService: IMessagingService,
  params: Node.ProposeInstallParams
): Promise<Node.ProposeInstallResult> {
  if (params.abiEncodings.actionEncoding === undefined) {
    delete params.abiEncodings.actionEncoding;
  }

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

/**
 * This converts a proposed app instance to an installed app instance while
 * sending an approved ack to the proposer.
 * @param channels
 * @param messagingService
 * @param params
 */
export async function install(
  channels: Channels,
  messagingService: IMessagingService,
  params: Node.InstallParams
): Promise<Node.InstallResult> {
  const appInstance = await channels.install(params);
  const appInstanceUUID = appInstance.id;

  const [peerAddress] = await channels.getPeersAddressFromAppInstanceID(
    appInstanceUUID
  );

  const installApprovalMsg: NodeMessage = {
    from: channels.selfAddress,
    event: Node.EventName.INSTALL,
    data: {
      appInstanceId: appInstanceUUID,
      proposal: false
    }
  };

  await messagingService.send(peerAddress, installApprovalMsg);
  return {
    appInstance
  };
}

/**
 * This function adds the app instance as a pending installation if the proposal
 * flag is set. Otherwise it adds the app instance as an installed app into the
 * appropriate channel.
 *
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
    const appInstanceUUID = params.appInstanceId;
    delete params.appInstanceId;
    await channels.setAppInstanceIDForProposeInstall(params, appInstanceUUID);
  } else {
    await channels.install(params);
  }
}
