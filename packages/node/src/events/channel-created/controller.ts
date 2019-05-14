import { Operation, Resource } from "@ebryn/jsonapi-ts";

import { StateChannel } from "../../machine";
import { RequestHandler } from "../../request-handler";

/**
 * This creates an entry for an already-created multisig sent by a peer.
 * @param nodeMsg
 */
export default async function addMultisigController(
  requestHandler: RequestHandler,
  nodeMsg: Operation
) {
  const data = nodeMsg.data as Resource;
  const multisigAddress = data.attributes.multisigAddress as string;
  const multisigOwners = data.attributes.owners as string[];
  await requestHandler.store.saveStateChannel(
    StateChannel.setupChannel(
      requestHandler.networkContext.ETHBucket,
      multisigAddress,
      multisigOwners
    )
  );
}
