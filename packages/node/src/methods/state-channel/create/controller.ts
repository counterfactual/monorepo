import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import { NetworkContext, Node } from "@counterfactual/types";
import { Contract, Event, Signer } from "ethers";
import { TransactionReceipt, TransactionResponse } from "ethers/providers";
import { Interface } from "ethers/utils";
import Queue from "p-queue";

import { xkeysToSortedKthAddresses } from "../../../machine";
import { RequestHandler } from "../../../request-handler";
import { CreateChannelMessage, NODE_EVENTS } from "../../../types";
import { NodeController } from "../../controller";
import { ERRORS } from "../../errors";

// TODO: Add good estimate for ProxyFactory.createProxy
const CREATE_PROXY_AND_SETUP_GAS = 6e6;

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
 */
export default class CreateChannelController extends NodeController {
  public static readonly methodName = Node.MethodName.CREATE_CHANNEL;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.CreateChannelParams
  ): Promise<Queue[]> {
    return [requestHandler.getShardedQueue(CreateChannelController.methodName)];
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.CreateChannelParams
  ): Promise<Node.CreateChannelTransactionResult> {
    const { owners } = params;
    const {
      wallet,
      networkContext,
      blocksNeededForConfirmation
    } = requestHandler;

    const tx = await this.sendMultisigDeployTx(owners, wallet, networkContext);

    tx.wait(blocksNeededForConfirmation).then(receipt =>
      this.handleDeployedMultisigOnChain(receipt, requestHandler, params)
    );

    return { transactionHash: tx.hash! };
  }

  private async handleDeployedMultisigOnChain(
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

    let multisigAddress: string;

    try {
      multisigAddress = (receipt["events"] as Event[])!.pop()!.args![0];
    } catch (e) {
      console.error(`Invalid multisig deploy tx receipt: ${receipt}`);
      throw e;
    }

    const [respondingXpub] = owners.filter(x => x !== publicIdentifier);

    await store.saveStateChannel(
      (await instructionExecutor.runSetupProtocol({
        multisigAddress,
        respondingXpub,
        initiatingXpub: publicIdentifier
      })).get(multisigAddress)!
    );

    const msg: CreateChannelMessage = {
      from: publicIdentifier,
      type: NODE_EVENTS.CREATE_CHANNEL,
      data: {
        multisigAddress,
        owners,
        counterpartyXpub: respondingXpub
      } as Node.CreateChannelResult
    };

    await messagingService.send(respondingXpub, msg);

    requestHandler.outgoing.emit(NODE_EVENTS.CREATE_CHANNEL, msg.data);
  }

  private async sendMultisigDeployTx(
    xpubs: string[],
    signer: Signer,
    networkContext: NetworkContext
  ): Promise<TransactionResponse> {
    const multisigOwners = xkeysToSortedKthAddresses(xpubs, 0);

    const proxyFactory = new Contract(
      networkContext.ProxyFactory,
      ProxyFactory.abi,
      signer
    );

    const setupData = new Interface(
      MinimumViableMultisig.abi
    ).functions.setup.encode([multisigOwners]);

    let error;
    const retryCount = 3;
    for (let tryCount = 0; tryCount < retryCount; tryCount += 1) {
      try {
        const extraGasLimit = tryCount * 1e6;
        const tx: TransactionResponse = await proxyFactory.functions.createProxy(
          networkContext.MinimumViableMultisig,
          setupData,
          {
            gasLimit: CREATE_PROXY_AND_SETUP_GAS + extraGasLimit,
            gasPrice: await signer.provider!.getGasPrice()
          }
        );

        if (!tx.hash) {
          return Promise.reject(
            `${ERRORS.NO_TRANSACTION_HASH_FOR_MULTISIG_DEPLOYMENT}: ${tx}`
          );
        }

        return tx;
      } catch (e) {
        error = e;
        console.error(`Channel creation attempt ${tryCount} failed: ${e}.\n
                      Retrying ${retryCount - tryCount} more times`);
      }
    }
    return Promise.reject(`${ERRORS.CHANNEL_CREATION_FAILED}: ${error}`);
  }
}
