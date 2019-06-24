import ERC20 from "@counterfactual/contracts/build/ERC20.json";
import {
  AppInterface,
  coinBalanceRefundStateEncoding,
  NetworkContext,
  Node,
  OutcomeType,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { Contract } from "ethers";
import { AddressZero, Zero } from "ethers/constants";
import {
  BaseProvider,
  TransactionRequest,
  TransactionResponse
} from "ethers/providers";
import { BigNumber, bigNumberify } from "ethers/utils";

import { InstallParams, xkeyKthAddress } from "../../../machine";
import { StateChannel } from "../../../models";
import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS } from "../../../types";
import { getPeersAddressFromChannel } from "../../../utils";
import { DEPOSIT_FAILED } from "../../errors";

export interface ETHBalanceRefundAppState {
  recipient: string;
  multisig: string;
  threshold: BigNumber;
}

export interface ERC20BalanceRefundAppState extends ETHBalanceRefundAppState {
  token: string;
}

interface DepositContext {
  initialState: SolidityABIEncoderV2Type;
  appInterface: AppInterface;
}

export async function installBalanceRefundApp(
  requestHandler: RequestHandler,
  params: Node.DepositParams
) {
  const {
    publicIdentifier,
    instructionExecutor,
    networkContext,
    store,
    provider
  } = requestHandler;

  const { multisigAddress } = params;
  const [peerAddress] = await getPeersAddressFromChannel(
    publicIdentifier,
    store,
    multisigAddress
  );

  let stateChannel = await store.getStateChannel(multisigAddress);
  const channelsMap = new Map<string, StateChannel>([
    [multisigAddress, stateChannel]
  ]);

  const depositContext = await getDepositContext(
    params,
    publicIdentifier,
    provider,
    networkContext
  );

  stateChannel = channelsMap.get(multisigAddress)!;

  const installParams: InstallParams = {
    initialState: depositContext.initialState,
    initiatingXpub: publicIdentifier,
    respondingXpub: peerAddress,
    multisigAddress: stateChannel.multisigAddress,
    initiatingBalanceDecrement: Zero,
    respondingBalanceDecrement: Zero,
    signingKeys: stateChannel.getNextSigningKeys(),
    appInterface: depositContext.appInterface,
    // this is the block-time equivalent of 7 days
    defaultTimeout: 1008,
    outcomeType: OutcomeType.COIN_TRANSFER
  };

  const stateChannelsMap = await instructionExecutor.runInstallProtocol(
    channelsMap,
    installParams
  );

  await store.saveStateChannel(stateChannelsMap.get(params.multisigAddress)!);
}

export async function makeDeposit(
  requestHandler: RequestHandler,
  params: Node.DepositParams
): Promise<boolean> {
  const { multisigAddress, amount, tokenAddress } = params;
  const { provider, blocksNeededForConfirmation, outgoing } = requestHandler;

  const signer = await requestHandler.getSigner();
  let txResponse: TransactionResponse;

  if (!tokenAddress) {
    const tx: TransactionRequest = {
      to: multisigAddress,
      value: bigNumberify(amount),
      gasLimit: 30000,
      gasPrice: await provider.getGasPrice()
    };

    let retryCount = 3;
    while (retryCount > 0) {
      try {
        txResponse = await signer.sendTransaction(tx);
        break;
      } catch (e) {
        if (
          e.toString().includes("reject") ||
          e.toString().includes("denied")
        ) {
          outgoing.emit(NODE_EVENTS.DEPOSIT_FAILED, e);
          console.error(`${DEPOSIT_FAILED}: ${e}`);
          return false;
        }

        retryCount -= 1;

        if (retryCount === 0) {
          throw new Error(`${DEPOSIT_FAILED}: ${e}`);
        }
      }
    }

    outgoing.emit(NODE_EVENTS.DEPOSIT_STARTED, {
      value: amount,
      txHash: txResponse!.hash
    });

    await txResponse!.wait(blocksNeededForConfirmation);
  } else {
    const erc20Contract = new Contract(tokenAddress, ERC20.abi, signer);
    await erc20Contract.functions.transfer(
      multisigAddress,
      bigNumberify(amount)
    );
  }

  return true;
}

export async function uninstallBalanceRefundApp(
  requestHandler: RequestHandler,
  params: Node.DepositParams
) {
  const {
    publicIdentifier,
    store,
    instructionExecutor,
    networkContext
  } = requestHandler;

  let balanceRefundAddress = networkContext.CoinBalanceRefundApp;
  if (params.tokenAddress) {
    balanceRefundAddress = networkContext.CoinBalanceRefundApp;
  }

  const [peerAddress] = await getPeersAddressFromChannel(
    publicIdentifier,
    store,
    params.multisigAddress
  );

  const stateChannel = await store.getStateChannel(params.multisigAddress);

  const refundApp = stateChannel.getAppInstanceOfKind(balanceRefundAddress);

  const stateChannelsMap = await instructionExecutor.runUninstallProtocol(
    // https://github.com/counterfactual/monorepo/issues/747
    new Map<string, StateChannel>([
      [stateChannel.multisigAddress, stateChannel]
    ]),
    {
      initiatingXpub: publicIdentifier,
      respondingXpub: peerAddress,
      multisigAddress: stateChannel.multisigAddress,
      appIdentityHash: refundApp.identityHash
    }
  );

  await store.saveStateChannel(
    stateChannelsMap.get(stateChannel.multisigAddress)!
  );
}

async function getDepositContext(
  params: Node.DepositParams,
  publicIdentifier: string,
  provider: BaseProvider,
  networkContext: NetworkContext
): Promise<DepositContext> {
  const { multisigAddress } = params;
  const tokenAddress = params.tokenAddress ? params.tokenAddress : AddressZero;
  let threshold = await provider.getBalance(multisigAddress);

  if (tokenAddress !== AddressZero) {
    const tokenContract = new Contract(tokenAddress!, ERC20.abi, provider);
    threshold = await tokenContract.functions.balanceOf(multisigAddress);
  }

  const initialState = {
    tokenAddress,
    threshold,
    recipient: xkeyKthAddress(publicIdentifier, 0),
    multisig: multisigAddress
  };

  return {
    initialState,
    appInterface: {
      addr: networkContext.CoinBalanceRefundApp,
      stateEncoding: coinBalanceRefundStateEncoding,
      actionEncoding: undefined
    }
  };
}
