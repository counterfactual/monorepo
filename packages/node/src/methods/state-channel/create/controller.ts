import { Address, Node } from "@counterfactual/types";
import { Wallet } from "ethers";

import { RequestHandler } from "../../../request-handler";
import { CreateMultisigMessage, NODE_EVENTS } from "../../../types";

import { openStateChannel } from "./instance";

/**
 * This creates a multisig while sending details about this multisig
 * to the peer with whom the multisig is owned.
 * This also instantiates a StateChannel object to encapsulate the "channel"
 * having been opened via the creation of the multisig.
 * @param params
 */
export default async function createMultisigController(
  requestHandler: RequestHandler,
  params: Node.CreateMultisigParams
): Promise<Node.CreateMultisigResult> {
  const multisigAddress = generateNewMultisigAddress(params.owners);
  await openStateChannel(
    multisigAddress,
    params.owners,
    requestHandler.store,
    requestHandler.networkContext
  );

  const [respondingAddress] = params.owners.filter(
    owner => owner !== requestHandler.address
  );

  const multisigCreatedMsg: CreateMultisigMessage = {
    from: requestHandler.address,
    event: NODE_EVENTS.CREATE_MULTISIG,
    data: {
      multisigAddress,
      params: {
        owners: params.owners
      }
    }
  };
  await requestHandler.messagingService.send(
    respondingAddress,
    multisigCreatedMsg
  );
  return {
    multisigAddress
  };
}

function generateNewMultisigAddress(owners: Address[]): Address {
  // TODO: implement this using CREATE2
  return Wallet.createRandom().address;
}
