import { AssetType, NetworkContext } from "@counterfactual/types";

import { SetupCommitment } from "../ethereum";
import { StateChannel } from "../models/state-channel";
import { Opcode } from "../opcodes";
import { Context, InternalMessage } from "../types";

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/04-setup-protocol#messages
 *
 */
export const SETUP_PROTOCOL = {
  0: [
    // Compute the next state of the channel
    proposeStateTransition,

    // Decide whether or not to sign the transition
    Opcode.OP_SIGN,

    // Wrap the signature into a message to be sent
    prepareToSendSignature,

    // Send the message to your counterparty
    Opcode.IO_SEND,

    // Wait for them to countersign the message
    Opcode.IO_WAIT,

    // Verify they did indeed countersign the right thing
    Opcode.OP_SIGN_VALIDATE,

    // Consider the state transition finished and commit it
    Opcode.STATE_TRANSITION_COMMIT
  ],

  1: [
    // Compute the _proposed_ next state of the channel
    proposeStateTransition,

    // Validate your counterparties signature is for the above proposal
    Opcode.OP_SIGN_VALIDATE,

    // Sign the same state update yourself
    Opcode.OP_SIGN,

    // Wrap the signature into a message to be sent
    prepareToSendSignature,

    // Send the message to your counterparty
    Opcode.IO_SEND,

    // Consider the state transition finished and commit it
    Opcode.STATE_TRANSITION_COMMIT
  ]
};

function proposeStateTransition(
  message: InternalMessage,
  context: Context,
  state: StateChannel
) {
  context.proposedStateTransition = state.setupChannel(context.network);
  context.operation = constructSetupOp(
    context.network,
    context.proposedStateTransition
  );
}

function prepareToSendSignature(
  message: InternalMessage,
  context: Context,
  state: StateChannel
) {
  context.outbox.push({
    ...message.clientMessage,
    signature: context.signature,
    seq: message.clientMessage.seq + 1
  });
}

export function constructSetupOp(
  network: NetworkContext,
  stateChannel: StateChannel
) {
  const freeBalanceId = stateChannel.freeBalanceAppIndexes.get(AssetType.ETH);

  if (freeBalanceId === undefined) {
    throw Error(
      "Attempted to construct commitment for Setup Protocol with an undefined free balance"
    );
  }

  const freeBalance = stateChannel.apps.get(freeBalanceId);

  if (freeBalance === undefined) {
    throw Error("ETH Free Balance App was not found in the given StateChannel");
  }

  return new SetupCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    freeBalance.identity,
    freeBalance.terms
  );
}
