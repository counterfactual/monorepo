import { Node } from "@counterfactual/types";

import { NodeMessage } from "../node";

import { RequestHandler } from "./request-handler";

/**
 * This creates a multisig while sending details about this multisig
 * to the peer with whom the multisig is owned.
 * @param params
 */
export async function createMultisig(
  this: RequestHandler,
  params: Node.CreateMultisigParams
): Promise<Node.CreateMultisigResult> {
  const result = {
    multisigAddress: await this.channels.createMultisig(params)
  };
  const selfAddress = this.channels.selfAddress;
  const [peerAddress] = params.owners.filter(owner => owner !== selfAddress);

  const multisigCreatedMsg: NodeMessage = {
    from: selfAddress,
    event: Node.EventName.CREATE_MULTISIG,
    // TODO: define interface for cross-Node payloads
    data: {
      multisigAddress: result.multisigAddress,
      owners: params.owners
    }
  };
  await this.messagingService.send(peerAddress, multisigCreatedMsg);
  return result;
}

/**
 * This creates an entry for an already-created multisig sent by a peer.
 * @param nodeMsg
 */
export async function addMultisig(this: RequestHandler, nodeMsg: NodeMessage) {
  const params = nodeMsg.data;
  await this.channels.addMultisig(params.multisigAddress, params.owners);
}

export async function getChannelAddresses(
  this: RequestHandler
): Promise<Node.GetChannelAddressesResult> {
  return {
    multisigAddresses: await this.channels.getAllChannelAddresses()
  };
}
