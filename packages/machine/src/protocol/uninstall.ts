import {
  AssetType,
  ETHBucketAppState,
  NetworkContext
} from "@counterfactual/types";

import { UninstallCommitment } from "../ethereum";
import { StateChannel } from "../models";
import { Opcode } from "../opcodes";
import { Context, InternalMessage } from "../types";

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/06-uninstall-protocol#messages
 *
 */
export const UNINSTALL_PROTOCOL = {
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
  // FIXME: use real app id
  context.proposedStateTransition = state.uninstallApp(context.appId);
  context.operation = constructUninstallOp(
    context.network,
    context.proposedStateTransition,
    // FIXME: use real stuff here too
    "3"
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

export function constructUninstallOp(
  network: NetworkContext,
  stateChannel: StateChannel,
  // TODO: is there a better arg here?
  uninstallTargetId: string
  // uninstallResolutions: any[]
) {
  if (uninstallTargetId === undefined) {
    throw new Error(
      `Request to uninstall an undefined app id: ${uninstallTargetId}`
    );
  }

  const freeBalanceId = stateChannel.freeBalanceAppIndexes.get(AssetType.ETH);
  if (freeBalanceId === undefined) {
    throw new Error(
      "Attempted to construct commitment for Setup Protocol with an undefined free balance"
    );
  }

  const freeBalance = stateChannel.apps.get(freeBalanceId);
  if (freeBalance === undefined) {
    throw new Error(
      "ETH Free Balance App was not found in the given StateChannel"
    );
  }

  // FIXME: We need a means of checking if proposed resolution is good
  // if (<app module>.isValidUninstall(app.state, uninstallResolutions)) {
  //   continue;
  // }

  // FIXME: hard-coded 5 for uninstall data :S
  (freeBalance.latestState as ETHBucketAppState).aliceBalance.add(5);

  return new UninstallCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    freeBalance.identity,
    freeBalance.terms,
    freeBalance.latestState as ETHBucketAppState,
    freeBalance.latestNonce,
    freeBalance.latestTimeout,
    freeBalance.dependencyReferenceNonce
  );
}
