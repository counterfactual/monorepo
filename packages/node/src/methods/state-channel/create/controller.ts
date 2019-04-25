import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import Proxy from "@counterfactual/contracts/build/Proxy.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import { NetworkContext, Node } from "@counterfactual/types";
import { Contract, Signer } from "ethers";
import { TransactionResponse } from "ethers/providers";
import {
  getAddress,
  Interface,
  keccak256,
  solidityKeccak256,
  solidityPack
} from "ethers/utils";
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
    const { wallet, networkContext } = requestHandler;

    const multisigOwners = xkeysToSortedKthAddresses(owners, 0);

    const setupData = new Interface(
      MinimumViableMultisig.abi
    ).functions.setup.encode([multisigOwners]);

    const multisigAddress = getAddress(
      solidityKeccak256(
        ["bytes1", "address", "uint256", "bytes32"],
        [
          "0xff",
          networkContext.ProxyFactory,
          solidityKeccak256(["bytes32", "uint256"], [keccak256(setupData), 0]),
          keccak256(
            solidityPack(
              ["bytes", "uint256"],
              [`0x${Proxy.bytecode}`, networkContext.MinimumViableMultisig]
            )
          )
        ]
      ).slice(-40)
    );

    const tx = await this.sendMultisigDeployTx(
      wallet,
      setupData,
      networkContext
    );

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
      messagingService,
      store
    } = requestHandler;

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
    signer: Signer,
    setupData: string,
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
          setupData,
          0, // TODO: Increment nonce as needed
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
