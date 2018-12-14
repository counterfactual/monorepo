import { NetworkContext } from "@counterfactual/types";

import { SetStateCommitment } from "../ethereum";
import { StateChannel } from "../models/state-channel";
import { Opcode } from "../opcodes";
import { ProtocolMessage, UpdateData } from "../protocol-types-tbd";
import { Context } from "../types";

import { prepareToSendSignature } from "./signature-forwarder";

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/07-update-protocol#messages
 *
 */
export const UPDATE_PROTOCOL = {
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
  message: ProtocolMessage,
  context: Context,
  state: StateChannel
) {
  const { appInstanceId, newState } = message.params as UpdateData;
  context.stateChannel = state.setState(appInstanceId, newState);
  context.operation = constructUpdateOp(
    context.network,
    context.stateChannel,
    appInstanceId
  );
}

export function constructUpdateOp(
  network: NetworkContext,
  stateChannel: StateChannel,
  appInstanceId: string
) {
  const app = stateChannel.apps.get(appInstanceId);

  if (app === undefined) {
    throw Error(
      "Attempted to construct SetState commitment with undefined app"
    );
  }

  return new SetStateCommitment(
    network,
    app.identity,
    app.hashOfLatestState,
    app.latestNonce,
    app.latestTimeout
  );
}
