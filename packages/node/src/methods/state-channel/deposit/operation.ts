import {
  AppInterface,
  erc20BalanceRefundStateEncoding,
  ethBalanceRefundStateEncoding,
  NetworkContext,
  Node,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { Zero } from "ethers/constants";
import {
  BaseProvider,
  TransactionRequest,
  TransactionResponse
} from "ethers/providers";
import { BigNumber, bigNumberify } from "ethers/utils";

import { xkeyKthAddress } from "../../../machine";
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

  const [peerAddress] = await getPeersAddressFromChannel(
    publicIdentifier,
    store,
    params.multisigAddress
  );

  const stateChannel = await store.getStateChannel(params.multisigAddress);

  const depositContext = await getAssetBasedDepositContext(
    params,
    publicIdentifier,
    stateChannel,
    provider,
    networkContext
  );

  const stateChannelsMap = await instructionExecutor.runInstallProtocol(
    new Map<string, StateChannel>([
      // TODO: (architectural decision) Should this use `getAllChannels` or
      //       is this good enough? InstallProtocol only operates on a single
      //       channel, anyway. PR #532 might make this question obsolete.
      [stateChannel.multisigAddress, stateChannel]
    ]),
    {
      initialState: depositContext.initialState,
      initiatingXpub: publicIdentifier,
      respondingXpub: peerAddress,
      multisigAddress: stateChannel.multisigAddress,
      initiatingBalanceDecrement: Zero,
      respondingBalanceDecrement: Zero,
      signingKeys: stateChannel.getNextSigningKeys(),
      appInterface: depositContext.appInterface,
      // this is the block-time equivalent of 7 days
      defaultTimeout: 1008
    }
  );

  await store.saveStateChannel(stateChannelsMap.get(params.multisigAddress)!);
}

export async function makeDeposit(
  requestHandler: RequestHandler,
  params: Node.DepositParams
): Promise<boolean> {
  const { multisigAddress, amount } = params;
  const { provider, blocksNeededForConfirmation, outgoing } = requestHandler;

  const signer = await requestHandler.getSigner();

  const tx: TransactionRequest = {
    to: multisigAddress,
    value: bigNumberify(amount),
    gasLimit: 30000,
    gasPrice: await provider.getGasPrice()
  };

  let txResponse: TransactionResponse;

  let retryCount = 3;
  while (retryCount > 0) {
    try {
      txResponse = await signer.sendTransaction(tx);
      break;
    } catch (e) {
      if (e.toString().includes("reject") || e.toString().includes("denied")) {
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

  const { ETHBalanceRefundApp } = networkContext;

  const [peerAddress] = await getPeersAddressFromChannel(
    publicIdentifier,
    store,
    params.multisigAddress
  );

  const stateChannel = await store.getStateChannel(params.multisigAddress);

  const refundApp = stateChannel.getAppInstanceOfKind(ETHBalanceRefundApp);

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

async function getAssetBasedDepositContext(
  params: Node.DepositParams,
  publicIdentifier: string,
  stateChannel: StateChannel,
  provider: BaseProvider,
  networkContext: NetworkContext
): Promise<DepositContext> {
  const initialState = {
    recipient: xkeyKthAddress(publicIdentifier, 0),
    multisig: stateChannel.multisigAddress,
    threshold: await provider.getBalance(params.multisigAddress)
  };

  if (!params.tokenAddress) {
    return {
      initialState,
      appInterface: {
        addr: networkContext.ETHBalanceRefundApp,
        stateEncoding: ethBalanceRefundStateEncoding,
        actionEncoding: undefined
      }
    };
  }
  return {
    initialState: {
      ...initialState,
      token: params.tokenAddress
    },
    appInterface: {
      addr: networkContext.ERC20BalanceRefundApp,
      stateEncoding: erc20BalanceRefundStateEncoding,
      actionEncoding: undefined
    }
  };
}
