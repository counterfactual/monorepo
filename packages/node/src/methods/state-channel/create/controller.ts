import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import { xkeysToSortedKthAddresses } from "@counterfactual/machine";
import { Address, Node } from "@counterfactual/types";
import { Contract, Event, Signer } from "ethers";
import { TransactionReceipt, TransactionResponse } from "ethers/providers";
import { Interface } from "ethers/utils";
import Queue from "promise-queue";

import { RequestHandler } from "../../../request-handler";
import { CreateChannelMessage, NODE_EVENTS } from "../../../types";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";

// ProxyFactory.createProxy uses assembly `call` so we can't estimate
// gas needed, so we hard-code this number to ensure the tx completes
const CREATE_PROXY_AND_SETUP_GAS = 6e6;

class ChannelCreator extends NodeController {
  static async enqueueByShard(requestHandler: RequestHandler): Promise<Queue> {
    const queue = requestHandler.getShardedQueue("channelCreation");

    if (queue.getPendingLength() > 0) {
      console.log("waiting for pending requests");
    }

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
    const tx = await ChannelCreator.sendMultisigDeployTransaction(
      params.owners,
      requestHandler.wallet,
      requestHandler.networkContext.MinimumViableMultisig,
      requestHandler.networkContext.ProxyFactory
    );

    tx.wait(1).then(receipt => {
      ChannelCreator.handleDeployedMultisigOnChain.bind(this)(
        receipt,
        requestHandler,
        params
      );
    });

    return { transactionHash: tx.hash as string };
  }

  static async handleDeployedMultisigOnChain(
    receipt: TransactionReceipt,
    requestHandler: RequestHandler,
    params: Node.CreateChannelParams
  ) {
    const { owners } = params;
    const {
      publicIdentifier,
      instructionExecutor,
      messagingService,
      store
    } = requestHandler;

    const multisigAddress = (receipt["events"] as Event[])!.pop()!.args![0];

    const [respondingXpub] = owners.filter(x => x !== publicIdentifier);

    const executeSetupProtocol = async () =>
      await store.saveStateChannel(
        (await instructionExecutor.runSetupProtocol({
          multisigAddress,
          respondingXpub,
          initiatingXpub: publicIdentifier
        })).get(multisigAddress)!
      );

    await requestHandler
      .getShardedQueue("setupProtocol")
      .add(executeSetupProtocol);

    const msg: CreateChannelMessage = {
      from: publicIdentifier,
      type: NODE_EVENTS.CREATE_CHANNEL,
      data: { multisigAddress, owners } as Node.CreateChannelResult
    };

    await messagingService.send(respondingXpub, msg);

    requestHandler.outgoing.emit(NODE_EVENTS.CREATE_CHANNEL, msg.data);
  }

  static async sendMultisigDeployTransaction(
    ownersPublicIdentifiers: string[],
    signer: Signer,
    multisigMasterCopyAddress: Address,
    proxyFactoryAddress: Address
  ): Promise<TransactionResponse> {
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

      return transaction;
    } catch (e) {
      return Promise.reject(`${ERRORS.CHANNEL_CREATION_FAILED}: ${e}`);
    }
  }
}

const createChannelController = ChannelCreator.executeMethod;
export default createChannelController;
