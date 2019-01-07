import { Node } from "@counterfactual/types";

import { NodeMessage } from "../node";

import { RequestHandler } from "./request-handler";

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
 * @param channels
 * @param messagingService
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
 *
 * @param channels
 * @param messagingService
 * @param params
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
