import {
  AssetType,
  ETHBucketAppState,
  NetworkContext
} from "@counterfactual/types";

import { UninstallCommitment } from "../ethereum";
import { StateChannel } from "../models";
import { Opcode } from "../opcodes";
import { ProtocolMessage, UninstallParams } from "../protocol-types-tbd";
import { Context } from "../types";

import { prepareToSendSignature } from "./utils/signature-forwarder";

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
  message: ProtocolMessage,
  context: Context,
  state: StateChannel
) {
  const {
    appIdentityHash,
    aliceBalanceIncrement,
    bobBalanceIncrement
  } = message.params as UninstallParams;

  context.stateChannel = state.uninstallApp(
    appIdentityHash,
    aliceBalanceIncrement,
    bobBalanceIncrement
  );

  context.operation = constructUninstallOp(
    context.network,
    context.stateChannel,
    appIdentityHash
  );
}

export function constructUninstallOp(
  network: NetworkContext,
  stateChannel: StateChannel,
  uninstallTargetId: string
) {
  if (uninstallTargetId === undefined) {
    throw new Error(
      `Request to uninstall an undefined app id: ${uninstallTargetId}`
    );
  }

  const freeBalance = stateChannel.getFreeBalanceFor(AssetType.ETH);

  // FIXME: We need a means of checking if proposed resolution is good
  // if (<app module>.isValidUninstall(app.state, uninstallResolutions)) {
  //   continue;
  // }

  // NOTE: You might be wondering ... why isn't aliceBalanceIncrement and
  //       bobBalanceIncrmeent in the scope of this function? Well, the answer
  //       is that the Uninstall Protocol requires users to sign a FULL OVERWRITE
  //       of the FreeBalance app's state. We already assigned the new values in
  //       the <uninstallApp> method on the StateChannel earlier, which is in scope
  //       at this point. So, when we pass it into UninstallCommitment below, it reads
  //       from the newly updated latestState property to generate the commitment.

  return new UninstallCommitment(
    network,
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
