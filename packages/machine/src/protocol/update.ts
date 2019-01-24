import { NetworkContext } from "@counterfactual/types";

import { ProtocolExecutionFlow } from "..";
import { Opcode } from "../enums";
import { SetStateCommitment } from "../ethereum";
import { StateChannel } from "../models/state-channel";
import { Context, ProtocolMessage, UpdateParams } from "../types";

import { verifyInboxLengthEqualTo1 } from "./utils/inbox-validator";
import {
  addSignedCommitmentInResponseWithSeq2,
  addSignedCommitmentToOutboxForSeq1
} from "./utils/signature-forwarder";
import { validateSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/07-update-protocol#messages
 *
 */
export const UPDATE_PROTOCOL: ProtocolExecutionFlow = {
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
        message.toAddress,
        context.commitment,
        context.inbox[0].signature
      ),

    // Consider the state transition finished and commit it
    Opcode.STATE_TRANSITION_COMMIT
  ],

  1: [
    // Compute the _proposed_ next state of the channel
    proposeStateTransition,

    // Validate your counterparty's signature is for the above proposal
    (message: ProtocolMessage, context: Context) =>
      validateSignature(
        message.fromAddress,
        context.commitment,
        message.signature
      ),

    // Sign the same state update yourself
    Opcode.OP_SIGN,

    // Wrap the signature into a message to be sent
    addSignedCommitmentInResponseWithSeq2,

    // Send the message to your counterparty
    Opcode.IO_SEND,

    // Consider the state transition finished and commit it
    Opcode.STATE_TRANSITION_COMMIT
  ]
};

function proposeStateTransition(message: ProtocolMessage, context: Context) {
  const {
    appIdentityHash,
    newState,
    multisigAddress
  } = message.params as UpdateParams;
  const newStateChannel = context.stateChannelsMap
    .get(multisigAddress)!
    .setState(appIdentityHash, newState);
  context.stateChannelsMap.set(multisigAddress, newStateChannel);
  context.commitment = constructUpdateOp(
    context.network,
    newStateChannel,
    appIdentityHash
  );
  context.appIdentityHash = appIdentityHash;
}

function constructUpdateOp(
  network: NetworkContext,
  stateChannel: StateChannel,
  appIdentityHash: string
) {
  const app = stateChannel.getAppInstance(appIdentityHash);

  return new SetStateCommitment(
    network,
    app.identity,
    app.hashOfLatestState,
    app.nonce,
    app.timeout
  );
}
