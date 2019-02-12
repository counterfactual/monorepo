import { StateChannel } from "@counterfactual/machine";
import {
  sortAddresses,
  xkeyKthAddress
} from "@counterfactual/machine/dist/src/xkeys";
import {
  AssetType,
  Node,
  SolidityABIEncoderV2Struct
} from "@counterfactual/types";
import { AddressZero, MaxUint256, Zero } from "ethers/constants";
import { BigNumber } from "ethers/utils";

import { RequestHandler } from "../../../request-handler";
import { DepositConfirmationMessage, NODE_EVENTS } from "../../../types";
import { getPeersAddressFromChannel } from "../../../utils";
import { ERRORS } from "../../errors";

export interface ETHBalanceRefundAppState extends SolidityABIEncoderV2Struct {
  recipient: string;
  multisig: string;
  threshold: BigNumber;
}

export async function installBalanceRefundApp(
  requestHandler: RequestHandler,
  params: Node.DepositParams
) {
  const {
    publicIdentifier,
    instructionExecutor,
    networkContext,
    store
  } = requestHandler;

  const [peerAddress] = await getPeersAddressFromChannel(
    publicIdentifier,
    store,
    params.multisigAddress
  );

  const stateChannel = await store.getStateChannel(params.multisigAddress);
  const initialState: ETHBalanceRefundAppState = {
    recipient: xkeyKthAddress(publicIdentifier, 0),
    multisig: stateChannel.multisigAddress,
    threshold: await requestHandler.provider.getBalance(params.multisigAddress)
  };
  const stateChannelsMap = await instructionExecutor.runInstallProtocol(
    new Map<string, StateChannel>([
      // TODO: (architectural decision) Should this use `getAllChannels` or
      //       is this good enough? InstallProtocol only operates on a single
      //       channel, anyway. PR #532 might make this question obsolete.
      [stateChannel.multisigAddress, stateChannel]
    ]),
    {
      initialState,
      initiatingAddress: publicIdentifier,
      respondingAddress: peerAddress,
      multisigAddress: stateChannel.multisigAddress,
      aliceBalanceDecrement: Zero,
      bobBalanceDecrement: Zero,
      signingKeys: stateChannel.getNextSigningKeys(),
      terms: {
        // TODO: generalize
        assetType: AssetType.ETH,
        limit: MaxUint256,
        token: AddressZero
      },
      appInterface: {
        addr: networkContext.ETHBalanceRefund,
        stateEncoding:
          "tuple(address recipient, address multisig,  uint256 threshold)",
        actionEncoding: undefined
      },
      // this is the block-time equivalent of 7 days
      defaultTimeout: 1008
    }
  );

  await store.saveStateChannel(stateChannelsMap.get(params.multisigAddress)!);
}

export async function makeDeposit(
  requestHandler: RequestHandler,
  params: Node.DepositParams
) {
  const { store } = requestHandler;
  const tx = {
    to: params.multisigAddress,
    value: params.amount
  };

  const depositPromise = requestHandler.wallet.sendTransaction({
    ...tx,
    gasPrice: await requestHandler.provider.estimateGas(tx)
  });
  requestHandler.outgoing.emit(NODE_EVENTS.DEPOSIT_STARTED);
  depositPromise.then(async () => {
    requestHandler.outgoing.emit(NODE_EVENTS.DEPOSIT_CONFIRMED);
    const [peerAddress] = await getPeersAddressFromChannel(
      requestHandler.publicIdentifier,
      store,
      params.multisigAddress
    );

    await requestHandler.messagingService.send(peerAddress, {
      from: requestHandler.publicIdentifier,
      type: NODE_EVENTS.DEPOSIT_CONFIRMED,
      data: params
    } as DepositConfirmationMessage);
  });

  depositPromise.catch(e => {
    requestHandler.outgoing.emit(NODE_EVENTS.DEPOSIT_FAILED, e);
    return Promise.reject(`${ERRORS.DEPOSIT_FAILED}: ${e}`);
  });

  await depositPromise;
}

export async function uninstallBalanceRefundApp(
  requestHandler: RequestHandler,
  params: Node.DepositParams
) {
  const { publicIdentifier, store, instructionExecutor } = requestHandler;

  const [peerAddress] = await getPeersAddressFromChannel(
    publicIdentifier,
    store,
    params.multisigAddress
  );

  const stateChannel = await store.getStateChannel(params.multisigAddress);

  let aliceBalanceIncrement = Zero;
  let bobBalanceIncrement = Zero;
  const sortedXKeys = sortAddresses(stateChannel.userNeuteredExtendedKeys);
  // This deterministically decides whether the public identifier being used to
  // make the deposit is Alice or Bob
  if (requestHandler.publicIdentifier === sortedXKeys[0]) {
    aliceBalanceIncrement = params.amount;
  } else {
    bobBalanceIncrement = params.amount;
  }

  const stateChannelsMap = await instructionExecutor.runUninstallProtocol(
    new Map(Object.entries(await store.getAllChannels())),
    {
      aliceBalanceIncrement,
      bobBalanceIncrement,
      initiatingAddress: publicIdentifier,
      respondingAddress: peerAddress,
      multisigAddress: stateChannel.multisigAddress,
      appIdentityHash: stateChannel.getAppInstanceOfKind(
        requestHandler.networkContext.ETHBalanceRefund
      ).identityHash
    }
  );

  await store.saveStateChannel(
    stateChannelsMap.get(stateChannel.multisigAddress)!
  );
}
