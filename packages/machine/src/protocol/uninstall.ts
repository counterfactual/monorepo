import { AssetType, ETHBucketAppState } from "@counterfactual/types";
import { BaseProvider } from "ethers/providers";

import { ProtocolExecutionFlow } from "..";
import { Opcode } from "../enums";
import { UninstallCommitment } from "../ethereum";
import { StateChannel } from "../models";
import { Context, ProtocolMessage, UninstallParams } from "../types";
import { xkeyKthAddress } from "../xkeys";

import {
  computeFreeBalanceIncrements,
  getAliceBobMap
} from "./utils/get-resolution-increments";
import { verifyInboxLengthEqualTo1 } from "./utils/inbox-validator";
import { setFinalCommitment } from "./utils/set-final-commitment";
import {
  addSignedCommitmentInResponse,
  addSignedCommitmentToOutboxForSeq1
} from "./utils/signature-forwarder";
import { validateSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/06-uninstall-protocol#messages
 *
 */
export const UNINSTALL_PROTOCOL: ProtocolExecutionFlow = {
  0: [
    // Compute the next state of the channel
    proposeStateTransition,

    // Sign `context.commitment.hashToSign`
    Opcode.OP_SIGN,

    // Wrap the signature into a message to be sent
    addSignedCommitmentToOutboxForSeq1,

    // Send the message to your counterparty and wait for a reply
    Opcode.IO_SEND_AND_WAIT,

    // Verify a message was received
    (_: ProtocolMessage, context: Context) =>
      verifyInboxLengthEqualTo1(context.inbox),

    // Verify they did indeed countersign the right thing
    (message: ProtocolMessage, context: Context) =>
      validateSignature(
        xkeyKthAddress(message.toXpub, 0),
        context.commitments[0],
        context.inbox[0].signature
      ),

    setFinalCommitment(true),

    Opcode.WRITE_COMMITMENT
  ],

  1: [
    // Compute the _proposed_ next state of the channel
    proposeStateTransition,

    // Validate your counterparty's signature is for the above proposal
    (message: ProtocolMessage, context: Context) =>
      validateSignature(
        xkeyKthAddress(message.fromXpub, 0),
        context.commitments[0],
        message.signature
      ),

    // Sign the same state update yourself
    Opcode.OP_SIGN,

    // Write commitment

    setFinalCommitment(false),

    Opcode.WRITE_COMMITMENT,

    // Wrap the signature into a message to be sent
    addSignedCommitmentInResponse,

    // Send the message to your counterparty
    Opcode.IO_SEND
  ]
};

async function proposeStateTransition(
  message: ProtocolMessage,
  context: Context,
  provider: BaseProvider
) {
  const { network, stateChannelsMap } = context;
  const {
    appIdentityHash,
    multisigAddress
  } = message.params as UninstallParams;

  const sc = stateChannelsMap.get(multisigAddress) as StateChannel;

  const sequenceNo = sc.getAppInstance(appIdentityHash).appSeqNo;

  const increments = await computeFreeBalanceIncrements(
    sc,
    appIdentityHash,
    provider
  );

  const aliceBobMap = getAliceBobMap(sc);

  const newStateChannel = sc.uninstallApp(
    appIdentityHash,
    increments[aliceBobMap.alice],
    increments[aliceBobMap.bob]
  );

  stateChannelsMap.set(multisigAddress, newStateChannel);

  const freeBalance = newStateChannel.getFreeBalanceFor(AssetType.ETH);

  const uninstallCommitment = new UninstallCommitment(
    network,
    newStateChannel.multisigAddress,
    newStateChannel.multisigOwners,
    freeBalance.identity,
    freeBalance.terms,
    freeBalance.state as ETHBucketAppState,
    freeBalance.nonce,
    freeBalance.timeout,
    sequenceNo
  );

  context.commitments[0] = uninstallCommitment;
  context.appIdentityHash = appIdentityHash;
}
