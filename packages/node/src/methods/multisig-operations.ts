import { StateChannel } from "@counterfactual/machine";
import {
  Address,
  AssetType,
  NetworkContext,
  Node
} from "@counterfactual/types";
import { Wallet } from "ethers";
import { bigNumberify } from "ethers/utils";

import { NodeMessage } from "../node";
import { RequestHandler } from "../request-handler";
import { Store } from "../store";

/**
 * This creates a multisig while sending details about this multisig
 * to the peer with whom the multisig is owned.
 * This also instantiates a StateChannel object to encapsulate the "channel"
 * having been opened via the creation of the multisig.
 * @param params
 */
export async function createMultisigController(
  this: RequestHandler,
  params: Node.CreateMultisigParams
): Promise<Node.CreateMultisigResult> {
  const multisigAddress = generateNewMultisigAddress(params.owners);
  await openStateChannel(
    multisigAddress,
    params.owners,
    this.store,
    this.networkContext
  );

  const [peerAddress] = params.owners.filter(
    owner => owner !== this.selfAddress
  );

  const multisigCreatedMsg: NodeMessage = {
    from: this.selfAddress,
    event: Node.EventName.CREATE_MULTISIG,
    // TODO: define interface for cross-Node payloads
    data: {
      multisigAddress,
      owners: params.owners
    }
  };
  await this.messagingService.send(peerAddress, multisigCreatedMsg);
  return {
    multisigAddress
  };
}

/**
 * This also instantiates a StateChannel object to encapsulate the "channel"
 * having been opened via the creation of the multisig.
 * @param multisigAddress
 * @param owners
 * @param store
 * @param networkContext
 */
export async function openStateChannel(
  multisigAddress: Address,
  owners: Address[],
  store: Store,
  networkContext: NetworkContext
): Promise<StateChannel> {
  let stateChannel = new StateChannel(multisigAddress, owners).setupChannel(
    networkContext
  );
  const freeBalanceETH = stateChannel.getFreeBalanceFor(AssetType.ETH);

  const state = {
    alice: stateChannel.multisigOwners[0],
    bob: stateChannel.multisigOwners[1],
    aliceBalance: bigNumberify(0),
    bobBalance: bigNumberify(0)
  };

  stateChannel = stateChannel.setState(freeBalanceETH.identityHash, state);
  await store.saveStateChannel(stateChannel);
  return stateChannel;
}

/**
 * This creates an entry for an already-created multisig sent by a peer.
 * @param nodeMsg
 */
export async function addMultisig(this: RequestHandler, nodeMsg: NodeMessage) {
  const params = nodeMsg.data;
  let stateChannel = new StateChannel(
    params.multisigAddress,
    params.owners
  ).setupChannel(this.networkContext);
  const freeBalanceETH = stateChannel.getFreeBalanceFor(AssetType.ETH);

  const state = {
    alice: stateChannel.multisigOwners[0],
    bob: stateChannel.multisigOwners[1],
    aliceBalance: bigNumberify(0),
    bobBalance: bigNumberify(0)
  };

  stateChannel = stateChannel.setState(freeBalanceETH.identityHash, state);
  await this.store.saveStateChannel(stateChannel);
}

export async function getAllChannelAddressesController(
  this: RequestHandler
): Promise<Node.GetChannelAddressesResult> {
  const channels = await this.store.getAllChannels();
  return {
    multisigAddresses: Object.keys(channels)
  };
}

function generateNewMultisigAddress(owners: Address[]): Address {
  // TODO: implement this using CREATE2
  return Wallet.createRandom().address;
}
