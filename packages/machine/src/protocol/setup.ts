import { AssetType, NetworkContext } from "@counterfactual/types";

import { ProtocolExecutionFlow } from "..";
import { Opcode } from "../enums";
import { SetupCommitment } from "../ethereum";
import { StateChannel } from "../models/state-channel";
import { Context, ProtocolMessage, SetupParams } from "../types";
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

    // Send the message to your counterparty and wait for a reply
    Opcode.IO_SEND_AND_WAIT,

    // Verify a message was received
    (_: ProtocolMessage, context: Context) =>
      verifyInboxLengthEqualTo1(context.inbox),

    // Verify they did indeed countersign the right thing
    (message: ProtocolMessage, context: Context) =>
      validateSignature(
        xkeyKthAddress(message.toAddress, 0),
        context.commitments[0],
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
        xkeyKthAddress(message.fromAddress, 0),
        context.commitments[0],
        message.signature
      ),

    // Sign the same state update yourself
    Opcode.OP_SIGN,

    // Wrap the signature into a message to be sent
    addSignedCommitmentInResponse,

    // Send the message to your counterparty
    Opcode.IO_SEND,

    // Consider the state transition finished and commit it
    Opcode.STATE_TRANSITION_COMMIT
  ]
};

function proposeStateTransition(message: ProtocolMessage, context: Context) {
  console.log("proposing transition for setup");
  const {
    multisigAddress,
    initiatingXpub,
    respondingXpub
  } = message.params as SetupParams;

  if (context.stateChannelsMap.has(multisigAddress)) {
    throw Error(`Found an already-setup channel at ${multisigAddress}`);
  }

  const newStateChannel = StateChannel.setupChannel(
    context.network.ETHBucket,
    multisigAddress,
    [initiatingXpub, respondingXpub]
  );

  context.stateChannelsMap.set(multisigAddress, newStateChannel);
  context.commitments[0] = constructSetupOp(context.network, newStateChannel);
  console.log("proposed transition for setup");
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
