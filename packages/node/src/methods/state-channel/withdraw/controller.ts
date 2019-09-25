import MinimumViableMultisig from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/ProxyFactory.json";
import { NetworkContext, Node } from "@counterfactual/types";
import { Contract, Signer } from "ethers";
import {
  JsonRpcProvider,
  Provider,
  TransactionResponse
} from "ethers/providers";
import log from "loglevel";
import { Interface } from "ethers/utils";
import { jsonRpcMethod } from "rpc-server";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../constants";
import { xkeyKthAddress, xkeysToSortedKthAddresses } from "../../../machine";
import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS } from "../../../types";
import {
  getCreate2MultisigAddress,
  prettyPrintObject,
  sleep
} from "../../../utils";
import { NodeController } from "../../controller";
import {
  CANNOT_WITHDRAW,
  CHANNEL_CREATION_FAILED,
  INSUFFICIENT_FUNDS_TO_WITHDRAW,
  NO_TRANSACTION_HASH_FOR_MULTISIG_DEPLOYMENT,
  WITHDRAWAL_FAILED
} from "../../errors";

import { runWithdrawProtocol } from "./operation";
import { sortAddresses } from "../../../machine/xkeys";

// Estimate based on:
// https://rinkeby.etherscan.io/tx/0xaac429aac389b6fccc7702c8ad5415248a5add8e8e01a09a42c4ed9733086bec
const CREATE_PROXY_AND_SETUP_GAS = 500_000;

export default class WithdrawController extends NodeController {
  @jsonRpcMethod(Node.RpcMethodName.WITHDRAW)
  public executeMethod = super.executeMethod;

  public static async getRequiredLockNames(
    requestHandler: RequestHandler,
    params: Node.WithdrawParams
  ): Promise<string[]> {
    const { store, publicIdentifier, networkContext } = requestHandler;

    const stateChannel = await store.getStateChannel(params.multisigAddress);

    if (
      stateChannel.hasAppInstanceOfKind(networkContext.CoinBalanceRefundApp)
    ) {
      throw Error(CANNOT_WITHDRAW);
    }

    const tokenAddress =
      params.tokenAddress || CONVENTION_FOR_ETH_TOKEN_ADDRESS;

    const senderBalance = stateChannel
      .getFreeBalanceClass()
      .getBalance(
        tokenAddress,
        stateChannel.getFreeBalanceAddrOf(publicIdentifier)
      );
    if (senderBalance.lt(params.amount)) {
      throw Error(
        INSUFFICIENT_FUNDS_TO_WITHDRAW(
          tokenAddress,
          params.amount,
          senderBalance
        )
      );
    }

    return [params.multisigAddress];
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.WithdrawParams
  ): Promise<Node.WithdrawResult> {
    const {
      store,
      provider,
      wallet,
      publicIdentifier,
      blocksNeededForConfirmation,
      outgoing,
      networkContext
    } = requestHandler;

    const { multisigAddress, amount, recipient } = params;

    params.recipient = recipient || xkeyKthAddress(publicIdentifier, 0);

    const channel = await store.getStateChannel(multisigAddress);
    // Check if the multisig contract has already been deployed on-chain
    if ((await provider.getCode(multisigAddress)) === "0x") {
      const tx = await this.sendMultisigDeployTx(
        wallet,
        channel.multisigOwners,
        networkContext
      );

      // TODO: await tx
    }

    await runWithdrawProtocol(requestHandler, params);

    const commitment = await store.getWithdrawalCommitment(multisigAddress);

    if (!commitment) {
      throw Error("No withdrawal commitment found");
    }

    const tx = {
      ...commitment,
      gasPrice: await provider.getGasPrice(),
      gasLimit: 300000
    };

    let txResponse: TransactionResponse;
    try {
      if (provider instanceof JsonRpcProvider) {
        const signer = await provider.getSigner();
        txResponse = await signer.sendTransaction(tx);
      } else {
        txResponse = await wallet.sendTransaction(tx);
      }

      outgoing.emit(NODE_EVENTS.WITHDRAWAL_STARTED, {
        value: amount,
        txHash: txResponse.hash
      });

      const txReceipt = await provider.waitForTransaction(
        txResponse.hash as string,
        blocksNeededForConfirmation
      );

      outgoing.emit(NODE_EVENTS.WITHDRAWAL_CONFIRMED, {
        txReceipt
      });
    } catch (e) {
      outgoing.emit(NODE_EVENTS.WITHDRAWAL_FAILED, e);
      throw Error(`${WITHDRAWAL_FAILED}: ${prettyPrintObject(e)}`);
    }

    return {
      recipient: params.recipient,
      txHash: txResponse.hash!
    };
  }

  private async sendMultisigDeployTx(
    signer: Signer,
    owners: string[],
    networkContext: NetworkContext,
    retryCount: number = 3
  ): Promise<TransactionResponse> {
    const proxyFactory = new Contract(
      networkContext.ProxyFactory,
      ProxyFactory.abi,
      signer
    );

    const provider = await signer.provider;

    if (!provider) {
      throw Error("wallet must have a provider");
    }

    let error;
    for (let tryCount = 1; tryCount < retryCount + 1; tryCount += 1) {
      try {
        const tx: TransactionResponse = await proxyFactory.functions.createProxyWithNonce(
          networkContext.MinimumViableMultisig,
          new Interface(MinimumViableMultisig.abi).functions.setup.encode([
            xkeysToSortedKthAddresses(owners, 0)
          ]),
          0, // TODO: Increment nonce as needed
          {
            gasLimit: CREATE_PROXY_AND_SETUP_GAS,
            gasPrice: provider.getGasPrice()
          }
        );

        if (!tx.hash) {
          throw Error(
            `${NO_TRANSACTION_HASH_FOR_MULTISIG_DEPLOYMENT}: ${prettyPrintObject(
              tx
            )}`
          );
        }

        // TODO: how was checkForCorrectOwners working without this?
        await provider.waitForTransaction(tx.hash);

        const ownersAreCorrectlySet = await checkForCorrectOwners(
          tx!,
          provider,
          owners,
          networkContext
        );

        if (!ownersAreCorrectlySet) {
          log.error(
            `${CHANNEL_CREATION_FAILED}: Could not confirm, on the ${tryCount} try, that the deployed multisig contract has the expected owners`
          );
          // wait on a linear backoff interval before retrying
          await sleep(1000 * tryCount);
          continue;
        }

        if (tryCount > 0) {
          log.debug(
            `Deploying multisig failed on first try, but succeeded on try #${tryCount}`
          );
        }
        return tx;
      } catch (e) {
        error = e;
        log.error(`Multisig deployment attempt ${tryCount} failed: ${e}.\n
                      Retrying ${retryCount - tryCount} more times`);
      }
    }

    throw Error(`${CHANNEL_CREATION_FAILED}: ${prettyPrintObject(error)}`);
  }
}

async function checkForCorrectOwners(
  tx: TransactionResponse,
  provider: Provider,
  xpubs: string[],
  networkContext: NetworkContext
): Promise<boolean> {
  const multisigAddress = getCreate2MultisigAddress(
    xpubs,
    networkContext.ProxyFactory,
    networkContext.MinimumViableMultisig
  );

  await tx.wait();

  const contract = new Contract(
    multisigAddress,
    MinimumViableMultisig.abi,
    provider
  );

  const expectedOwners = xkeysToSortedKthAddresses(xpubs, 0);

  const actualOwners = sortAddresses(await contract.functions.getOwners());

  return (
    expectedOwners[0] === actualOwners[0] &&
    expectedOwners[1] === actualOwners[1]
  );
}
