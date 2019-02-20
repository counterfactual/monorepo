import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import { xkeysToSortedKthAddresses } from "@counterfactual/machine";
import { Address, Node } from "@counterfactual/types";
import { Contract, Signer } from "ethers";
import { Interface } from "ethers/utils";

import { RequestHandler } from "../../../request-handler";
import {
  CreateMultisigMessage,
  NODE_EVENTS,
  NodeController,
  QUEUE_SHARD_KEYS
} from "../../../types";
import { ERRORS } from "../../errors";

// ProxyFactory.createProxy uses assembly `call` so we can't estimate
// gas needed, so we hard-code this number to ensure the tx completes
const CREATE_PROXY_AND_SETUP_GAS = 6e6;

class ChannelCreator implements NodeController {
  static enqueueByShard(
    target: Object,
    propertyName: string,
    propertyDesciptor: PropertyDescriptor
  ): PropertyDescriptor {
    const method = propertyDesciptor.value;

    propertyDesciptor.value = async (
      requestHandler: RequestHandler,
      params: Node.MethodParams
    ) => {
      const shardedQueue = await requestHandler.getShardedQueue(
        QUEUE_SHARD_KEYS.CHANNEL_CREATION
      );

      const result = await shardedQueue.add<Node.CreateChannelResult>(
        async () => {
          return await method.apply(this, [requestHandler, params]);
        }
      );

      return result;
    };
    return propertyDesciptor;
  }

  /**
   * This instantiates a StateChannel object to encapsulate the "channel"
   * having been opened via the creation of the multisig.
   * In "creating a channel", this also creates a multisig while sending details
   * about this multisig to the peer with whom the multisig is owned.
   * @param params
   */
  @ChannelCreator.enqueueByShard
  static async executeMethod(
    requestHandler: RequestHandler,
    params: Node.CreateChannelParams
  ): Promise<Node.CreateChannelResult> {
    const multisigAddress = await deployMinimumViableMultisigAndGetAddress(
      params.owners,
      requestHandler.wallet,
      requestHandler.networkContext.MinimumViableMultisig,
      requestHandler.networkContext.ProxyFactory
    );

    const [respondingXpub] = params.owners.filter(
      owner => owner !== requestHandler.publicIdentifier
    );

    const stateChannelsMap = await requestHandler.instructionExecutor.runSetupProtocol(
      {
        multisigAddress,
        respondingXpub,
        initiatingXpub: requestHandler.publicIdentifier
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
      respondingXpub,
      multisigCreatedMsg
    );

    return {
      multisigAddress
    };
  }
}

async function deployMinimumViableMultisigAndGetAddress(
  ownersPublicIdentifiers: string[],
  signer: Signer,
  multisigMasterCopyAddress: Address,
  proxyFactoryAddress: Address
): Promise<Address> {
  // TODO: implement this using CREATE2
  const multisigOwnerAddresses = xkeysToSortedKthAddresses(
    ownersPublicIdentifiers,
    0
  );

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
          multisigOwnerAddresses
        ]),
        { gasLimit: CREATE_PROXY_AND_SETUP_GAS }
      );
    } catch (e) {
      reject(`${ERRORS.CHANNEL_CREATION_FAILED}: ${e}`);
    }
  });
}

const createChannelController = ChannelCreator.executeMethod;
export default createChannelController;
