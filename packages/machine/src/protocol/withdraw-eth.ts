import {
  AssetType,
  ETHBucketAppState,
  NetworkContext
} from "@counterfactual/types";
import { AddressZero, Zero } from "ethers/constants";

import { ProtocolExecutionFlow } from "..";
import { Opcode } from "../enums";
import {
  InstallCommitment,
  UninstallCommitment,
  WithdrawETHCommitment
} from "../ethereum";
import { AppInstance, StateChannel } from "../models";
import { Context, ProtocolMessage, WithdrawParams } from "../types";
import { xkeyKthAddress } from "../xkeys";

import { verifyInboxLengthEqualTo1 } from "./utils/inbox-validator";
import { validateSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 *
 * TODO: Add protocol to specs
 *
 */
export const WITHDRAW_ETH_PROTOCOL: ProtocolExecutionFlow = {
  0: [
    addInstallRefundAppCommitmentToContext,

    addMultisigSendCommitmentToContext,

    Opcode.OP_SIGN,

    (message: ProtocolMessage, context: Context) => {
      context.outbox.push({
        ...message,
        fromAddress: message.params.initiatingXpub,
        toAddress: message.params.respondingXpub,
        signature: context.signatures[0],
        signature2: context.signatures[1],
        seq: 1
      });
    },

    Opcode.IO_SEND_AND_WAIT,

    (_: ProtocolMessage, context: Context) =>
      verifyInboxLengthEqualTo1(context.inbox),

    addUninstallRefundAppCommitmentToContext,

    (message: ProtocolMessage, context: Context) => {
      validateSignature(
        xkeyKthAddress(message.params.respondingXpub, 0),
        context.commitments[0],
        context.inbox[0].signature
      );

      validateSignature(
        xkeyKthAddress(message.params.respondingXpub, 0),
        context.commitments[1],
        context.inbox[0].signature2
      );

      validateSignature(
        xkeyKthAddress(message.params.respondingXpub, 0),
        context.commitments[2],
        context.inbox[0].signature3
      );
    },

    Opcode.OP_SIGN,

    (message: ProtocolMessage, context: Context) => {
      context.outbox[0] = {
        ...message,
        fromAddress: message.params.initiatingXpub,
        toAddress: message.params.respondingXpub,
        signature: context.signatures[0],
        signature2: context.signatures[1],
        signature3: context.signatures[2],
        seq: -1
      };
    },

    Opcode.IO_SEND,

    Opcode.STATE_TRANSITION_COMMIT
  ],

  1: [
    addInstallRefundAppCommitmentToContext,

    addMultisigSendCommitmentToContext,

    (message: ProtocolMessage, context: Context) => {
      validateSignature(
        xkeyKthAddress(message.params.initiatingXpub, 0),
        context.commitments[0],
        message.signature
      );

      validateSignature(
        xkeyKthAddress(message.params.initiatingXpub, 0),
        context.commitments[1],
        message.signature2
      );
    },

    addUninstallRefundAppCommitmentToContext,

    Opcode.OP_SIGN,

    (message: ProtocolMessage, context: Context) => {
      context.outbox[0] = {
        ...message,
        fromAddress: message.params.respondingXpub,
        toAddress: message.params.initiatingXpub,
        signature: context.signatures[0],
        signature2: context.signatures[1],
        signature3: context.signatures[2],
        seq: -1
      };
    },

    Opcode.IO_SEND_AND_WAIT,

    (_: ProtocolMessage, context: Context) =>
      verifyInboxLengthEqualTo1(context.inbox),

    (message: ProtocolMessage, context: Context) => {
      validateSignature(
        xkeyKthAddress(message.params.initiatingXpub, 0),
        context.commitments[2],
        context.inbox[0].signature3
      );
    },

    Opcode.STATE_TRANSITION_COMMIT
  ]
};

function addInstallRefundAppCommitmentToContext(
  message: ProtocolMessage,
  context: Context
) {
  const {
    recipient,
    amount,
    multisigAddress
  } = message.params as WithdrawParams;

  const stateChannel = context.stateChannelsMap.get(multisigAddress)!;

  const appInstance = new AppInstance(
    multisigAddress,
    stateChannel.getNextSigningKeys(),
    1008,
    {
      addr: context.network.ETHBalanceRefund,
      stateEncoding:
        "tuple(address recipient, address multisig,  uint256 threshold)",
      actionEncoding: undefined
    },
    {
      assetType: AssetType.ETH,
      limit: amount,
      token: AddressZero
    },
    false,
    stateChannel.numInstalledApps,
    stateChannel.rootNonceValue,
    {
      recipient,
      multisig: multisigAddress,
      threshold: amount
    },
    0,
    1008
  );

  let aliceBalanceDecrement = Zero;
  let bobBalanceDecrement = Zero;

  if (
    stateChannel.getFreeBalanceAddrOf(
      message.params.initiatingXpub,
      AssetType.ETH
    ) === stateChannel.multisigOwners[0]
  ) {
    aliceBalanceDecrement = amount;
  } else {
    bobBalanceDecrement = amount;
  }

  const newStateChannel = stateChannel.installApp(
    appInstance,
    aliceBalanceDecrement,
    bobBalanceDecrement
  );

  context.stateChannelsMap.set(multisigAddress, newStateChannel);

  const appIdentityHash = appInstance.identityHash;

  context.commitments[0] = constructInstallOp(
    context.network,
    newStateChannel,
    appIdentityHash
  );

  context.appIdentityHash = appIdentityHash;
}

function addUninstallRefundAppCommitmentToContext(
  message: ProtocolMessage,
  context: Context
) {
  const { multisigAddress } = message.params as WithdrawParams;

  const stateChannel = context.stateChannelsMap.get(multisigAddress)!;

  const newStateChannel = stateChannel.uninstallApp(
    context.appIdentityHash!,
    Zero,
    Zero
  );

  context.stateChannelsMap.set(multisigAddress, newStateChannel);

  const freeBalance = stateChannel.getFreeBalanceFor(AssetType.ETH);

  context.commitments[2] = new UninstallCommitment(
    context.network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    freeBalance.identity,
    freeBalance.terms,
    freeBalance.state as ETHBucketAppState,
    freeBalance.nonce,
    freeBalance.timeout,
    freeBalance.appSeqNo
  );
}

function addMultisigSendCommitmentToContext(
  message: ProtocolMessage,
  context: Context
) {
  const {
    recipient,
    amount,
    multisigAddress
  } = message.params as WithdrawParams;

  const stateChannel = context.stateChannelsMap.get(multisigAddress)!;

  context.commitments[1] = new WithdrawETHCommitment(
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    recipient,
    amount
  );
}

function constructInstallOp(
  network: NetworkContext,
  stateChannel: StateChannel,
  appIdentityHash: string
) {
  const app = stateChannel.getAppInstance(appIdentityHash);

  const freeBalance = stateChannel.getFreeBalanceFor(AssetType.ETH);

  return new InstallCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    app.identity,
    app.terms,
    freeBalance.identity,
    freeBalance.terms,
    freeBalance.hashOfLatestState,
    freeBalance.nonce,
    freeBalance.timeout,
    app.appSeqNo,
    freeBalance.rootNonceValue
  );
}
