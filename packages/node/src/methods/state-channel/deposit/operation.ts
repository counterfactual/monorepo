import ERC20 from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/ERC20.json";
import {
  AppInterface,
  CoinBalanceRefundState,
  coinBalanceRefundStateEncoding,
  NetworkContext,
  Node,
  OutcomeType,
  SolidityValueType
} from "@counterfactual/types";
import { Contract } from "ethers";
import { Zero } from "ethers/constants";
import {
  BaseProvider,
  TransactionRequest,
  TransactionResponse
} from "ethers/providers";
import { bigNumberify } from "ethers/utils";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../constants";
import { InstallParams, Protocol, xkeyKthAddress } from "../../../engine";
import { StateChannel } from "../../../models";
import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS } from "../../../types";
import { prettyPrintObject } from "../../../utils";
import { DEPOSIT_FAILED } from "../../errors";

const DEPOSIT_RETRY_COUNT = 3;

interface DepositContext {
  initialState: SolidityValueType;
  appInterface: AppInterface;
}

export async function installBalanceRefundApp(
  requestHandler: RequestHandler,
  params: Node.DepositParams
) {
  const {
    publicIdentifier,
    engine,
    networkContext,
    store,
    provider
  } = requestHandler;

  const { multisigAddress, tokenAddress } = params;

  const [peerAddress] = await StateChannel.getPeersAddressFromChannel(
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
    participants: stateChannel.getNextSigningKeys(),
    appInterface: depositContext.appInterface,
    // this is the block-time equivalent of 7 days
    defaultTimeout: 1008,
    appSeqNo: stateChannel.numProposedApps,
    outcomeType: OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER,
    initiatorDepositTokenAddress: tokenAddress!, // params object is mutated in caller
    responderDepositTokenAddress: tokenAddress!,
    // the balance refund is a special case where we want to set the limit to be
    // MAX_UINT256 instead of
    // `initiatorBalanceDecrement + responderBalanceDecrement` = 0
    disableLimit: true
  };

  await engine.initiateProtocol(
    Protocol.Install,
    stateChannelsMap,
    installParams
  );
}

export async function makeDeposit(
  requestHandler: RequestHandler,
  params: Node.DepositParams
): Promise<void> {
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

  let retryCount = DEPOSIT_RETRY_COUNT;
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
        throw Error(`${DEPOSIT_FAILED}: ${prettyPrintObject(e)}`);
      }

      retryCount -= 1;

      if (retryCount === 0) {
        outgoing.emit(
          NODE_EVENTS.DEPOSIT_FAILED,
          `Could not deposit after ${DEPOSIT_RETRY_COUNT} attempts`
        );
        throw Error(`${DEPOSIT_FAILED}: ${prettyPrintObject(e)}`);
      }
    }
  }

  outgoing.emit(NODE_EVENTS.DEPOSIT_STARTED, {
    value: amount,
    txHash: txResponse!.hash
  });

  await txResponse!.wait(blocksNeededForConfirmation);
}

export async function uninstallBalanceRefundApp(
  requestHandler: RequestHandler,
  params: Node.DepositParams
) {
  const { publicIdentifier, store, engine, networkContext } = requestHandler;

  const { multisigAddress } = params;

  const { CoinBalanceRefundApp } = networkContext;

  const [peerAddress] = await StateChannel.getPeersAddressFromChannel(
    publicIdentifier,
    store,
    multisigAddress
  );

  const stateChannel = await store.getStateChannel(params.multisigAddress);

  const refundApp = stateChannel.getAppInstanceOfKind(CoinBalanceRefundApp);

  const stateChannelsMap = await engine.initiateProtocol(
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
    tokenAddress,
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
