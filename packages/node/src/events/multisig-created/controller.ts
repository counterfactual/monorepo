import { StateChannel } from "@counterfactual/machine";

import { RequestHandler } from "../../request-handler";
import { CreateMultisigMessage } from "../../types";

/**
 * This creates an entry for an already-created multisig sent by a peer.
 * @param nodeMsg
 */
export default async function addMultisigController(
  requestHandler: RequestHandler,
  nodeMsg: CreateMultisigMessage
) {
  const multisigAddress = nodeMsg.data.multisigAddress;
  const multisigOwners = nodeMsg.data.params.owners;
  await requestHandler.store.saveStateChannel(
    StateChannel.setupChannel(
      requestHandler.networkContext,
      multisigAddress,
      multisigOwners
    )
  );
}
