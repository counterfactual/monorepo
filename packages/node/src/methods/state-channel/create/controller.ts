import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import { xkeysToSortedKthAddresses } from "@counterfactual/machine";
import { Address, Node } from "@counterfactual/types";
import { Contract, Signer } from "ethers";
import { TransactionResponse } from "ethers/providers";
import { Interface } from "ethers/utils";
import Queue from "promise-queue";

import { RequestHandler } from "../../../request-handler";
import { CreateChannelMessage, NODE_EVENTS } from "../../../types";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";

// ProxyFactory.createProxy uses assembly `call` so we can't estimate
// gas needed, so we hard-code this number to ensure the tx completes
const CREATE_PROXY_AND_SETUP_GAS = 6e6;

interface MultisigDeployment {
  proxyFactory: Contract;
  transactionHash: string;
}

class ChannelCreator extends NodeController {
  static async enqueueByShard(requestHandler: RequestHandler): Promise<Queue> {
    const queue = requestHandler.getShardedQueue("channelCreation");
    if (queue.getPendingLength() > 0) {
      console.log("waiting for pending requests");
    }
    console.log(queue.getQueueLength());
    return await requestHandler.getShardedQueue("channelCreation");
  }

  /**
   * This instantiates a StateChannel object to encapsulate the "channel"
   * having been opened via the creation of the multisig.
   * In "creating a channel", this also creates a multisig while sending details
   * about this multisig to the peer with whom the multisig is owned.
   *
   * Details: This returns the hash of the multisig deployment transaction so the
   * caller can async listen to the on chain confirmation of the transaction being
   * mined. Once the actual multisig is deployed, its _address_ is sent as an event
   * to the caller via the `NODE_EVENTS.CREATE_CHANNEL` event. This is because
   * the address of the multisig is not retrievable from the transaction hash
   * since the multisig is deployed through an internal transaction of a proxy
   * factory contract.
   * @param params
   */
  @ChannelCreator.enqueue
  static async executeMethod(
    // https://github.com/counterfactual/monorepo/issues/811
    // Removing the typing bypasses the error in the interim
    requestHandler: RequestHandler,
    params: Node.CreateChannelParams
  ): Promise<Node.CreateChannelTransactionResult> {
    const {
      proxyFactory,
      transactionHash
    } = await ChannelCreator.deployMinimumViableMultisigAndGetTransactionHash(
      params.owners,
      requestHandler.wallet,
      requestHandler.networkContext.MinimumViableMultisig,
      requestHandler.networkContext.ProxyFactory
    );

    console.log("registering proxy creation callback");

    proxyFactory.once("ProxyCreation", async multisigAddress => {
      const payload = {
        multisigAddress,
        owners: params.owners
      } as Node.CreateChannelResult;

      const [respondingXpub] = params.owners.filter(
        owner => owner !== requestHandler.publicIdentifier
      );

      const setupQueue = requestHandler.getShardedQueue("setupProtocol");
      await setupQueue.add(async () => {
        console.log("running the setup protocol");
        const stateChannelsMap = await requestHandler.instructionExecutor.runSetupProtocol(
          {
            multisigAddress,
            respondingXpub,
            initiatingXpub: requestHandler.publicIdentifier
          }
        );
        console.log("saving new map to db");
        await requestHandler.store.saveStateChannel(
          stateChannelsMap.get(multisigAddress)!
        );
        console.log(stateChannelsMap);
        console.log("ran the setup protocol");
      });

      const createChannelMsg: CreateChannelMessage = {
        from: requestHandler.publicIdentifier,
        type: NODE_EVENTS.CREATE_CHANNEL,
        data: payload
      };

      await requestHandler.messagingService.send(
        respondingXpub,
        createChannelMsg
      );

      console.log("sending out create channel event: ", payload);
      requestHandler.outgoing.emit(NODE_EVENTS.CREATE_CHANNEL, payload);
    });

    return {
      transactionHash
    };
  }

  static async deployMinimumViableMultisigAndGetTransactionHash(
    ownersPublicIdentifiers: string[],
    signer: Signer,
    multisigMasterCopyAddress: Address,
    proxyFactoryAddress: Address
  ): Promise<MultisigDeployment> {
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

    try {
      // TODO: implement retry around this with exponential backoff on the
      // gas limit to increase probability of proxy getting created
      const transaction: TransactionResponse = await proxyFactory.functions.createProxy(
        multisigMasterCopyAddress,
        new Interface(MinimumViableMultisig.abi).functions.setup.encode([
          multisigOwnerAddresses
        ]),
        { gasLimit: CREATE_PROXY_AND_SETUP_GAS }
      );

      if (transaction.hash === undefined) {
        return Promise.reject(
          `${
            ERRORS.NO_TRANSACTION_HASH_FOR_MULTISIG_DEPLOYMENT
          }: ${transaction}`
        );
      }

      return {
        proxyFactory,
        transactionHash: transaction.hash
      };
    } catch (e) {
      return Promise.reject(`${ERRORS.CHANNEL_CREATION_FAILED}: ${e}`);
    }
  }
}

const createChannelController = ChannelCreator.executeMethod;
export default createChannelController;
