import { StateChannel } from "@counterfactual/machine";
import { AssetType } from "@counterfactual/types";
import { bigNumberify } from "ethers/utils";

import { RequestHandler } from "../../request-handler";
import { CreateMultisigMessage } from "../../types";

/**
 * This creates an entry for an already-created multisig sent by a peer.
 * @param nodeMsg
 */
export async function addMultisigController(
  requestHandler: RequestHandler,
  nodeMsg: CreateMultisigMessage
) {
  let stateChannel = new StateChannel(
    nodeMsg.data.multisigAddress,
    nodeMsg.data.params.owners
  ).setupChannel(requestHandler.networkContext);
  const freeBalanceETH = stateChannel.getFreeBalanceFor(AssetType.ETH);

  const state = {
    alice: stateChannel.multisigOwners[0],
    bob: stateChannel.multisigOwners[1],
    aliceBalance: bigNumberify(0),
    bobBalance: bigNumberify(0)
  };

  stateChannel = stateChannel.setState(freeBalanceETH.identityHash, state);
  await requestHandler.store.saveStateChannel(stateChannel);
}
