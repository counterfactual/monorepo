import ERC20 from "@counterfactual/contracts/build/ERC20.json";
import {
  AppInterface,
  CoinBalanceRefundState,
  coinBalanceRefundStateEncoding,
  NetworkContext,
  Node,
  OutcomeType,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { Contract } from "ethers";
import { Zero } from "ethers/constants";
import {
  BaseProvider,
  TransactionRequest,
  TransactionResponse
} from "ethers/providers";
import { bigNumberify } from "ethers/utils";

import { InstallParams, Protocol, xkeyKthAddress } from "../../../machine";
import { StateChannel } from "../../../models";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../models/free-balance";
import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS } from "../../../types";
import { getPeersAddressFromChannel } from "../../../utils";
import { DEPOSIT_FAILED } from "../../errors";

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

  const { multisigAddress, tokenAddress } = params;

  const [peerAddress] = await getPeersAddressFromChannel(
    publicIdentifier,
    store,
    multisigAddress
  );

  const stateChannel = await store.getStateChannel(multisigAddress);

  const stateChannelsMap = new Map<string, StateChannel>([
    [stateChannel.multisigAddress, stateChannel]
  ]);

  const depositContext = await getDepositContext(
    params,
    publicIdentifier,
    provider,
    networkContext,
    tokenAddress!
  );

  const installParams: InstallParams = {
    initialState: depositContext.initialState,
    initiatorXpub: publicIdentifier,
    responderXpub: peerAddress,
    multisigAddress: stateChannel.multisigAddress,
    initiatorBalanceDecrement: Zero,
    responderBalanceDecrement: Zero,
    signingKeys: stateChannel.getNextSigningKeys(),
    appInterface: depositContext.appInterface,
    // this is the block-time equivalent of 7 days
    defaultTimeout: 1008,
    outcomeType: OutcomeType.REFUND_OUTCOME_TYPE,
    initiatorDepositTokenAddress: tokenAddress!, // params object is mutated in caller
    responderDepositTokenAddress: CONVENTION_FOR_ETH_TOKEN_ADDRESS
  };

  const updatedStateChannelsMap = await instructionExecutor.initiateProtocol(
    Protocol.Install,
    stateChannelsMap,
    installParams
  );

  await store.saveStateChannel(updatedStateChannelsMap.get(multisigAddress)!);
}

export async function makeDeposit(
  requestHandler: RequestHandler,
  params: Node.DepositParams
): Promise<boolean> {
  const { multisigAddress, amount, tokenAddress } = params;
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
      if (tokenAddress === CONVENTION_FOR_ETH_TOKEN_ADDRESS) {
        txResponse = await signer.sendTransaction(tx);
      } else {
        const erc20Contract = new Contract(tokenAddress!, ERC20.abi, signer);
        txResponse = await erc20Contract.functions.transfer(
          multisigAddress,
          bigNumberify(amount)
        );
      }
      break;
    } catch (e) {
      if (e.toString().includes("reject") || e.toString().includes("denied")) {
        outgoing.emit(NODE_EVENTS.DEPOSIT_FAILED, e);
        console.error(`${DEPOSIT_FAILED}: ${e}`);
        return false;
      }

      retryCount -= 1;

      if (retryCount === 0) {
        console.error(`${DEPOSIT_FAILED}: ${e}`);
        return false;
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

  const { multisigAddress } = params;

  const { CoinBalanceRefundApp } = networkContext;

  const [peerAddress] = await getPeersAddressFromChannel(
    publicIdentifier,
    store,
    multisigAddress
  );

  const stateChannel = await store.getStateChannel(params.multisigAddress);

  const refundApp = stateChannel.getAppInstanceOfKind(CoinBalanceRefundApp);

  const stateChannelsMap = await instructionExecutor.initiateProtocol(
    Protocol.Uninstall,
    // https://github.com/counterfactual/monorepo/issues/747
    new Map<string, StateChannel>([
      [stateChannel.multisigAddress, stateChannel]
    ]),
    {
      initiatorXpub: publicIdentifier,
      responderXpub: peerAddress,
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
  networkContext: NetworkContext,
  tokenAddress: string
): Promise<DepositContext> {
  const { multisigAddress } = params;

  const threshold =
    tokenAddress === CONVENTION_FOR_ETH_TOKEN_ADDRESS
      ? await provider.getBalance(multisigAddress)
      : await new Contract(
          tokenAddress!,
          ERC20.abi,
          provider
        ).functions.balanceOf(multisigAddress);

  const initialState = {
    threshold,
    token: tokenAddress,
    recipient: xkeyKthAddress(publicIdentifier, 0),
    multisig: multisigAddress
  } as CoinBalanceRefundState;

  return {
    initialState,
    appInterface: {
      addr: networkContext.CoinBalanceRefundApp,
      stateEncoding: coinBalanceRefundStateEncoding,
      actionEncoding: undefined
    }
  };
}
