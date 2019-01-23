import { AssetType, NetworkContext } from "@counterfactual/types";

import { ProtocolExecutionFlow } from "..";
import { SetupCommitment } from "../ethereum";
import { StateChannel } from "../models/state-channel";
import { Opcode } from "../opcodes";
import { ProtocolMessage, SetupParams } from "../protocol-types-tbd";
import { Context } from "../types";

import { verifyInboxLengthEqualTo1 } from "./utils/inbox-validator";
import {
  addSignedCommitmentInResponseWithSeq2,
  addSignedCommitmentToOutboxForSeq1
} from "./utils/signature-forwarder";
import { validateSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/04-setup-protocol#messages
 *
 */
export const SETUP_PROTOCOL: ProtocolExecutionFlow = {
  0: [
    // Compute the next state of the channel
    proposeStateTransition,

    // Sign `context.commitment.hashToSign`
    Opcode.OP_SIGN,

    // Wrap the signature into a message to be sent
    addSignedCommitmentToOutboxForSeq1,

    // Send the message to your counterparty
    Opcode.IO_SEND,

    // Wait for them to countersign the message
    Opcode.IO_WAIT,

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
    multisigAddress,
    initiatingAddress,
    respondingAddress
  } = message.params as SetupParams;

  if (context.stateChannelsMap.has(multisigAddress)) {
    throw Error(`Found an already-setup channel at ${multisigAddress}`);
  }

  const newStateChannel = StateChannel.setupChannel(
    context.network.ETHBucket,
    multisigAddress,
    [initiatingAddress, respondingAddress]
  );

  context.stateChannelsMap.set(multisigAddress, newStateChannel);
  context.commitment = constructSetupOp(context.network, newStateChannel);
}

export function constructSetupOp(
  network: NetworkContext,
  stateChannel: StateChannel
) {
  const freeBalance = stateChannel.getFreeBalanceFor(AssetType.ETH);

  return new SetupCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    freeBalance.identity,
    freeBalance.terms
  );
}
