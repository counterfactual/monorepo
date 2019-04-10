import { StateChannel } from "../../machine";
import { RequestHandler } from "../../request-handler";
import { CreateChannelMessage } from "../../types";

/**
 * This creates an entry for an already-created multisig sent by a peer.
 * @param nodeMsg
 */
export default async function addMultisigController(
  requestHandler: RequestHandler,
  nodeMsg: CreateChannelMessage
) {
  const multisigAddress = nodeMsg.data.multisigAddress;
  const multisigOwners = nodeMsg.data.owners;
  await requestHandler.store.saveStateChannel(
    StateChannel.setupChannel(
      requestHandler.networkContext.ETHBucket,
      multisigAddress,
      multisigOwners
    )
  );
}
