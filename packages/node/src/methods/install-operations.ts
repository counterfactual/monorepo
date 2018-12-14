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
 * @returns A UUID for the proposed AppInstance, effectively the AppInstanceID
 *          for the client
 */
export async function proposeInstall(
  channels: Channels,
  messagingService: IMessagingService,
  params: Node.ProposeInstallParams
): Promise<Node.ProposeInstallResult> {
  const uuid = await channels.getUUIDFromProposalInstall(params);

  const proposalMsg: NodeMessage = {
    from: channels.selfAddress,
    event: Node.EventName.INSTALL,
    data: {
      ...params,
      appInstanceId: uuid,
      proposal: true
    }
  };

  await messagingService.send(params.peerAddress, proposalMsg);

  return {
    appInstanceId: uuid
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

  const [peerAddress] = await channels.getPeersAddressFromAppInstanceUUID(
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
 * Client ID / UUID / AppInstanceId explanation:
 *
 * When a Node client initiates an AppInstance installation proposal, a UUID is
 * generated in the Node to identify this proposed app instance. To the Node
 * clients, this UUID becomes the ID of the AppInstance they proposed to install.
 * This enables the client to immediately get a response from the Node with
 * an ID to use as a handle for the proposed AppInstance.
 *
 * When a peer Node receiving this proposal accepts it and installs it, this
 * installation generates the channel-specific ID for the app instance as the
 * act of installation updates the state of the channel. This ID is then globablly
 * mapped (i.e. by all Nodes) to the UUID generated for the proposal. Any time
 * any clients use the UUID to refer to the AppInstance, the Node does a look up
 * for the internal, channel-specific ID to get/set any state for that AppInstance.
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
    await channels.setUUIDForProposeInstall(params, appInstanceUUID);
  } else {
    await channels.install(params);
  }
}
