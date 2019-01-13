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

  const [respondingAddress] = params.owners.filter(
    owner => owner !== this.address
  );

  const multisigCreatedMsg: CreateMultisigMessage = {
    from: this.address,
    event: NODE_EVENTS.CREATE_MULTISIG,
    data: {
      multisigAddress,
      params: {
        owners: params.owners
      }
    }
  };
  await this.messagingService.send(respondingAddress, multisigCreatedMsg);
  return {
    multisigAddress
  };
}

function generateNewMultisigAddress(owners: Address[]): Address {
  // TODO: implement this using CREATE2
  return Wallet.createRandom().address;
}
