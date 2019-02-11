import { AssetType, NetworkContext } from "@counterfactual/types";
import { AddressZero, Zero } from "ethers/constants";

import { ProtocolExecutionFlow } from "..";
import { Opcode } from "../enums";
import { InstallCommitment } from "../ethereum";
import { AppInstance, StateChannel } from "../models";
import { Context, InstallParams, ProtocolMessage } from "../types";
import { xkeyKthAddress } from "../xkeys";

import { verifyInboxLengthEqualTo1 } from "./utils/inbox-validator";
import {
  addSignedCommitmentInResponse,
  addSignedCommitmentToOutboxForSeq1
} from "./utils/signature-forwarder";
import { validateSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 *
 * TODO: Add protocol to specs
 *
 */
export const INSTALL_PROTOCOL: ProtocolExecutionFlow = {
  0: [
    addInstalledRefundAppToContext,

    Opcode.OP_SIGN,

    addSignedCommitmentToOutboxForSeq1,

    Opcode.IO_SEND_AND_WAIT,

    (_: ProtocolMessage, context: Context) =>
      verifyInboxLengthEqualTo1(context.inbox),

    (message: ProtocolMessage, context: Context) =>
      validateSignature(
        xkeyKthAddress(message.toAddress, 0),
        context.commitments[0],
        context.inbox[0].signature
      ),

    Opcode.STATE_TRANSITION_COMMIT
  ],

  1: [
    addInstalledRefundAppToContext,

    (message: ProtocolMessage, context: Context) =>
      validateSignature(
        xkeyKthAddress(message.fromAddress, 0),
        context.commitments[0],
        message.signature
      ),

    Opcode.OP_SIGN,

    addSignedCommitmentInResponse,

    Opcode.IO_SEND,

    Opcode.STATE_TRANSITION_COMMIT
  ]
};

function addInstalledRefundAppToContext(
  message: ProtocolMessage,
  context: Context
) {
  const {
    recipient,
    amount,
    multisigAddress
  } = message.params as InstallParams;

  const stateChannel = context.stateChannelsMap.get(multisigAddress)!;

  const appInstance = new AppInstance(
    multisigAddress,
    signingKeys,
    defaultTimeout,
    {
      addr: context.network.ETHBalanceRefund,
      stateEncoding: "",
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
    defaultTimeout
  );

  const newStateChannel = stateChannel.installApp(
    appInstance,
    aliceBalanceDecrement, // TODO: figure out who is alice, who is bob
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
