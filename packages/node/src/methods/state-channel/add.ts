import { StateChannel } from "@counterfactual/machine";
import { AssetType } from "@counterfactual/types";
import { bigNumberify } from "ethers/utils";

import { RequestHandler } from "../../request-handler";
import { NodeMessage } from "../../types";

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
