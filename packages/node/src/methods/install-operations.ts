import { Node } from "@counterfactual/common-types";

import { Channels } from "../channels";
import { NodeMessage } from "../node";
import { IMessagingService } from "../service-interfaces";

/**
 * This creates an entry of a proposed app instance into the relevant channel
 * while sending the proposal to the peer with whom this app instance is
 * indicated to be instantiated with.
 * @param channels
 * @param messagingService
 * @param params
 */
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
 *
 * When the proposer initiates an installation proposal, a UUID is generated
 * to identify that app instance (for its lifetime, regardless of whether it
 * gets installed or rejected). When a Node receives a proposal, this UUID is
 * supplied so the Nodes retain app instance handle parity amongst each other.
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
    // AppInstance knows about its ID via the `id` field, not `appInstanceId`
    // `appInstanceId` is only used outside the immediate context of an
    // AppInstance to clarify the ID belongs to an AppInstance
    params.id = params.appInstanceId;
    delete params.appInstanceId;
    await channels.proposeInstall(params, params.id);
  } else {
    await channels.install(params);
  }
}
