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
  const multisigAddress = nodeMsg.data.multisigAddress;
  const multisigOwners = nodeMsg.data.params.owners;
  await requestHandler.store.saveStateChannel(
    new StateChannel(multisigAddress, multisigOwners)
      .setupChannel(requestHandler.networkContext)
      .setFreeBalanceFor(AssetType.ETH, {
        alice: multisigOwners[0],
        bob: multisigOwners[1],
        aliceBalance: bigNumberify(0),
        bobBalance: bigNumberify(0)
      })
  );
}
