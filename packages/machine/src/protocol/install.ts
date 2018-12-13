import { AssetType, NetworkContext } from "@counterfactual/types";

import { InstallCommitment } from "../ethereum";
import { StateChannel } from "../models";
import { Opcode } from "../opcodes";
import { Context, InternalMessage } from "../types";

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/05-install-protocol#messages
 *
 */
export const INSTALL_PROTOCOL = {
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
  message,
  context: Context,
  node,
  state: StateChannel
) {
  // TODO: wut is context.app
  context.proposedStateTransition = state.installApp(context.app);
  context.operation = constructInstallOp(
    context.network,
    context.proposedStateTransition,
    // TODO: wut is appId
    context.appId
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

export function constructInstallOp(
  network: NetworkContext,
  stateChannel: StateChannel,
  appInstanceId: string
) {
  const app = stateChannel.apps.get(appInstanceId);

  if (app === undefined) {
    throw Error(
      "Attempted to construct InstallApp commitment with undefined app"
    );
  }

  const freeBalanceId = stateChannel.freeBalanceAppIndexes.get(AssetType.ETH);

  if (freeBalanceId === undefined) {
    throw Error(
      "Attempted to construct commitment for Install Protocol with an undefined free balance"
    );
  }

  const freeBalance = stateChannel.apps.get(freeBalanceId);

  if (freeBalance === undefined) {
    throw Error("ETH Free Balance App was not found in the given StateChannel");
  }

  return new InstallCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    app.identity,
    app.terms,
    freeBalance.identity,
    freeBalance.terms,
    freeBalance.hashOfLatestState,
    freeBalance.latestNonce,
    freeBalance.latestTimeout,
    freeBalance.dependencyReferenceNonce
  );
}
