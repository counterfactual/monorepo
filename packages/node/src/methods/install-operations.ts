import { Node } from "@counterfactual/types";

import { NodeMessage } from "../node";

import { RequestHandler } from "./request-handler";

/**
 * This creates an entry of a proposed app instance into the relevant channel
 * while sending the proposal to the peer with whom this app instance is
 * indicated to be instantiated with.
 * @param params
 * @returns The AppInstanceId for the proposed AppInstance
 */
export async function proposeInstall(
  this: RequestHandler,
  params: Node.ProposeInstallParams
): Promise<Node.ProposeInstallResult> {
  if (params.abiEncodings.actionEncoding === undefined) {
    delete params.abiEncodings.actionEncoding;
  }

  const appInstanceId = await this.channels.proposeInstall(params);

  const proposalMsg: NodeMessage = {
    from: this.channels.selfAddress,
    event: Node.EventName.INSTALL,
    data: {
      ...params,
      appInstanceId,
      proposal: true
    }
  };

  await this.messagingService.send(params.peerAddress, proposalMsg);

  return {
    appInstanceId
  };
}

/**
 * This converts a proposed app instance to an installed app instance while
 * sending an approved ack to the proposer.
 * @param params
 */
export async function install(
  this: RequestHandler,
  params: Node.InstallParams
): Promise<Node.InstallResult> {
  const appInstance = await this.channels.install(params);
  const appInstanceUUID = appInstance.id;

  const [peerAddress] = await this.channels.getPeersAddressFromAppInstanceID(
    appInstanceUUID
  );

  const installApprovalMsg: NodeMessage = {
    from: this.channels.selfAddress,
    event: Node.EventName.INSTALL,
    data: {
      appInstanceId: appInstanceUUID,
      proposal: false
    }
  };

  await this.messagingService.send(peerAddress, installApprovalMsg);
  return {
    appInstance
  };
}

/**
 * This function adds the app instance as a pending installation if the proposal
 * flag is set. Otherwise it adds the app instance as an installed app into the
 * appropriate channel.
 */
export async function addAppInstance(
  this: RequestHandler,
  nodeMsg: NodeMessage
) {
  const params = { ...nodeMsg.data };
  params.peerAddress = nodeMsg.from!;
  delete params.proposal;
  if (nodeMsg.data.proposal) {
    await this.channels.setAppInstanceIDForProposeInstall(params);
  } else {
    await this.channels.install(params);
  }
}

async function proposeInstall(
  params: Node.ProposeInstallParams
): Promise<string> {
  const appInstanceId = generateUUID();
  const channel = await this.getChannelFromPeerAddress(params.peerAddress);

  const proposedAppInstance = new ProposedAppInstanceInfo(
    appInstanceId,
    params
  );

  await this.store.addAppInstanceProposal(channel, proposedAppInstance);
  return appInstanceId;
}
