import MinimumViableMultisig from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/ProxyFactory.json";
import { NetworkContext, Node } from "@counterfactual/types";
import { Contract, Signer } from "ethers";
import { HashZero } from "ethers/constants";
import { Provider, TransactionResponse } from "ethers/providers";
import { Interface } from "ethers/utils";
import log from "loglevel";
import { jsonRpcMethod } from "rpc-server";

import { xkeysToSortedKthAddresses } from "../../../machine";
import { sortAddresses } from "../../../machine/xkeys";
import { RequestHandler } from "../../../request-handler";
import {
  getCreate2MultisigAddress,
  prettyPrintObject,
  sleep
} from "../../../utils";
import { NodeController } from "../../controller";
import {
  CHANNEL_CREATION_FAILED,
  NO_TRANSACTION_HASH_FOR_MULTISIG_DEPLOYMENT
} from "../../errors";

// Estimate based on:
// https://rinkeby.etherscan.io/tx/0xaac429aac389b6fccc7702c8ad5415248a5add8e8e01a09a42c4ed9733086bec
const CREATE_PROXY_AND_SETUP_GAS = 500_000;

export default class DeployStateDepositHolderController extends NodeController {
  @jsonRpcMethod(Node.RpcMethodName.DEPLOY_STATE_DEPOSIT_HOLDER)
  public executeMethod = super.executeMethod;

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.DeployStateDepositHolderParams
  ): Promise<Node.DeployStateDepositHolderResult> {
    const { multisigAddress, retryCount } = params;
    const { networkContext, store, provider, wallet } = requestHandler;

    // By default, if the contract has been deployed and
    // DB has records of it, controller will return HashZero
    let tx = { hash: HashZero } as TransactionResponse;

    const channel = await store.getStateChannel(multisigAddress);

    // Check if the contract has already been deployed on-chain
    if ((await provider.getCode(multisigAddress)) === "0x") {
      tx = await sendMultisigDeployTx(
        wallet,
        channel.userNeuteredExtendedKeys,
        networkContext,
        retryCount
      );
    }

    return { transactionHash: tx.hash! };
  }
}

async function sendMultisigDeployTx(
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

  const provider = signer.provider;

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
      log.error(`Channel creation attempt ${tryCount} failed: ${e}.\n
                    Retrying ${retryCount - tryCount} more times`);
    }
  }

  throw Error(`${CHANNEL_CREATION_FAILED}: ${prettyPrintObject(error)}`);
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
