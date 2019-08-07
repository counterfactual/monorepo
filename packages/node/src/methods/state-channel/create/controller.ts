import MinimumViableMultisig from "@counterfactual/cf-funding-protocol-contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/cf-funding-protocol-contracts/build/ProxyFactory.json";
import { NetworkContext, Node } from "@counterfactual/types";
import { Contract, Signer } from "ethers";
import { TransactionResponse } from "ethers/providers";
import { Interface } from "ethers/utils";
import Queue from "p-queue";
import { jsonRpcMethod } from "rpc-server";

import { xkeysToSortedKthAddresses } from "../../../machine";
import { RequestHandler } from "../../../request-handler";
import { CreateChannelMessage, NODE_EVENTS } from "../../../types";
import { getCreate2MultisigAddress } from "../../../utils";
import { NodeController } from "../../controller";
import {
  CHANNEL_CREATION_FAILED,
  NO_TRANSACTION_HASH_FOR_MULTISIG_DEPLOYMENT
} from "../../errors";

// TODO: Add good estimate for ProxyFactory.createProxy
const CREATE_PROXY_AND_SETUP_GAS = 6e6;

/**
 * This instantiates a StateChannel object to encapsulate the "channel"
 * having been opened via the deterministical calculation of the multisig contract's
 * address. This also deploys the multisig contract to chain though it's not
 * strictly needed to deploy it here as per
 * https://github.com/counterfactual/monorepo/issues/1183.
 *
 * This then sends the details of this multisig to the peer with whom the multisig
 * is owned and the multisig's _address_ is sent as an event
 * to whoever subscribed to the `NODE_EVENTS.CREATE_CHANNEL` event on the Node.
 */
export default class CreateChannelController extends NodeController {
  public static readonly methodName = Node.MethodName.CREATE_CHANNEL;

  @jsonRpcMethod(Node.RpcMethodName.CREATE_CHANNEL)
  public executeMethod = super.executeMethod;

  protected async enqueueByShard(
    requestHandler: RequestHandler
  ): Promise<Queue[]> {
    return [requestHandler.getShardedQueue(CreateChannelController.methodName)];
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.CreateChannelParams
  ): Promise<Node.CreateChannelTransactionResult> {
    const { owners } = params;
    const { wallet, networkContext } = requestHandler;

    const multisigAddress = getCreate2MultisigAddress(
      owners,
      networkContext.ProxyFactory,
      networkContext.MinimumViableMultisig
    );

    const tx = await this.sendMultisigDeployTx(wallet, owners, networkContext);

    this.handleDeployedMultisigOnChain(multisigAddress, requestHandler, params);

    return { transactionHash: tx.hash! };
  }

  private async handleDeployedMultisigOnChain(
    multisigAddress: string,
    requestHandler: RequestHandler,
    params: Node.CreateChannelParams
  ) {
    const { owners } = params;
    const {
      publicIdentifier,
      instructionExecutor,
      store,
      outgoing
    } = requestHandler;

    const [responderXpub] = owners.filter(x => x !== publicIdentifier);

    const channel = (await instructionExecutor.runSetupProtocol({
      multisigAddress,
      responderXpub,
      initiatorXpub: publicIdentifier
    })).get(multisigAddress)!;

    await store.saveStateChannel(channel);
    await store.saveFreeBalance(channel);

    const msg: CreateChannelMessage = {
      from: publicIdentifier,
      type: NODE_EVENTS.CREATE_CHANNEL,
      data: {
        multisigAddress,
        owners,
        counterpartyXpub: responderXpub
      } as Node.CreateChannelResult
    };

    outgoing.emit(NODE_EVENTS.CREATE_CHANNEL, msg);
  }

  private async sendMultisigDeployTx(
    signer: Signer,
    owners: string[],
    networkContext: NetworkContext
  ): Promise<TransactionResponse> {
    const proxyFactory = new Contract(
      networkContext.ProxyFactory,
      ProxyFactory.abi,
      signer
    );

    let error;
    const retryCount = 3;
    for (let tryCount = 0; tryCount < retryCount; tryCount += 1) {
      try {
        const extraGasLimit = tryCount * 1e6;
        const tx: TransactionResponse = await proxyFactory.functions.createProxyWithNonce(
          networkContext.MinimumViableMultisig,
          new Interface(MinimumViableMultisig.abi).functions.setup.encode([
            xkeysToSortedKthAddresses(owners, 0)
          ]),
          0, // TODO: Increment nonce as needed
          {
            gasLimit: CREATE_PROXY_AND_SETUP_GAS + extraGasLimit,
            gasPrice: await signer.provider!.getGasPrice()
          }
        );

        if (!tx.hash) {
          throw new Error(
            `${NO_TRANSACTION_HASH_FOR_MULTISIG_DEPLOYMENT}: ${tx}`
          );
        }

        return tx;
      } catch (e) {
        error = e;
        console.error(`Channel creation attempt ${tryCount} failed: ${e}.\n
                      Retrying ${retryCount - tryCount} more times`);
      }
    }

    throw new Error(`${CHANNEL_CREATION_FAILED}: ${error}`);
  }
}
