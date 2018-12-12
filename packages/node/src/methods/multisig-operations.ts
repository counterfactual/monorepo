import { Node } from "@counterfactual/common-types";

import { Channels } from "../channels";
import { NodeMessage } from "../node";
import { IMessagingService } from "../service-interfaces";

/**
 * This creates a multisig while sending details about this multisig
 * to the peer with whom the multisig is owned.
 * @param channels
 * @param messagingService
 * @param params
 */
export async function createMultisig(
  channels: Channels,
  messagingService: IMessagingService,
  params: Node.CreateMultisigParams
): Promise<Node.CreateMultisigResult> {
  const result = {
    multisigAddress: await channels.createMultisig(params)
  };
  const selfAddress = channels.selfAddress;
  const [peerAddress] = params.owners.filter(owner => owner !== selfAddress);

  const multisigCreatedMsg: NodeMessage = {
    from: selfAddress,
    event: Node.EventName.MULTISIG_CREATED,
    // TODO: define interface for cross-Node payloads
    data: {
      multisigAddress: result.multisigAddress,
      owners: params.owners
    }
  };
  await messagingService.send(peerAddress, multisigCreatedMsg);
  return result;
}

/**
 * This creates an entry for an already-created multisig sent by a peer.
 * @param channels
 * @param messagingService
 * @param nodeMsg
 */
export async function addMultisig(
  channels: Channels,
  messagingService: IMessagingService,
  nodeMsg: NodeMessage
) {
  const params = nodeMsg.data;
  await channels.addMultisig(params.multisigAddress, params.owners);
}

export async function getChannelAddresses(
  channels: Channels,
  messagingService: IMessagingService,
  nodeMsg: NodeMessage
): Promise<Node.GetChannelAddressesResult> {
  return {
    multisigAddresses: await channels.getAddresses()
  };
}
