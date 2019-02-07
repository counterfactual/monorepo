import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import { Address, Node } from "@counterfactual/types";
import { Contract, Signer } from "ethers";
import { Interface } from "ethers/utils";

import { RequestHandler } from "../../../request-handler";
import { CreateMultisigMessage, NODE_EVENTS } from "../../../types";
import { ERRORS } from "../../errors";

// ProxyFactory.createProxy uses assembly `call` so we can't estimate
// gas needed, so we hard-code this number to ensure the tx completes
const CREATE_PROXY_AND_SETUP_GAS = 6e6;

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
  const multisigAddress = await deployMinimumViableMultisigAndGetAddress(
    params.owners,
    requestHandler.wallet,
    requestHandler.networkContext.MinimumViableMultisig,
    requestHandler.networkContext.ProxyFactory
  );

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

async function deployMinimumViableMultisigAndGetAddress(
  owners: Address[],
  signer: Signer,
  multisigMasterCopyAddress: Address,
  proxyFactoryAddress: Address
): Promise<Address> {
  // TODO: implement this using CREATE2
  const proxyFactory = new Contract(
    proxyFactoryAddress,
    ProxyFactory.abi,
    signer
  );

  return new Promise(async (resolve, reject) => {
    try {
      proxyFactory.once("ProxyCreation", async proxy => {
        resolve(proxy);
      });

      // TODO: implement retry around this with exponential backoff on the
      // gas limit to increase probability of proxy getting created
      await proxyFactory.functions.createProxy(
        multisigMasterCopyAddress,
        new Interface(MinimumViableMultisig.abi).functions.setup.encode([
          owners
        ]),
        { gasLimit: CREATE_PROXY_AND_SETUP_GAS }
      );
    } catch (e) {
      reject(`${ERRORS.CHANNEL_CREATION_FAILED}: ${e}`);
    }
  });
}
