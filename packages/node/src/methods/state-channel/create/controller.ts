import { Address, Node } from "@counterfactual/types";
import { Wallet } from "ethers";

import { RequestHandler } from "../../../request-handler";
import { CreateMultisigMessage, NODE_EVENTS } from "../../../types";

/**
 * This instantiates a StateChannel object to encapsulate the "channel"
 * having been opened via the creation of the multisig.
 * In "creating a channel", this also creates a multisig while sending details
 * about this multisig to the peer with whom the multisig is owned.
 * @param params
 */
export default async function createChannelController(
  requestHandler: RequestHandler,
  params: Node.CreateChannelParams
): Promise<Node.CreateChannelResult> {
  const multisigAddress = generateNewMultisigAddress(params.owners);

  const [respondingAddress] = params.owners.filter(
    owner => owner !== requestHandler.publicIdentifier
  );

  const stateChannelsMap = await requestHandler.instructionExecutor.runSetupProtocol(
    {
      multisigAddress,
      respondingAddress,
      initiatingAddress: requestHandler.publicIdentifier
    }
  );

  await requestHandler.store.saveStateChannel(
    stateChannelsMap.get(multisigAddress)!
  );

  const multisigCreatedMsg: CreateMultisigMessage = {
    from: requestHandler.publicIdentifier,
    type: NODE_EVENTS.CREATE_CHANNEL,
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
  // FIXME: Even before CREATE2 this is incorrect
  // TODO: implement this using CREATE2
  return Wallet.createRandom().address;
}
