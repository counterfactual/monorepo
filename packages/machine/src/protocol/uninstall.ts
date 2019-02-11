import {
  AssetType,
  ETHBucketAppState,
  NetworkContext
} from "@counterfactual/types";

import { ProtocolExecutionFlow } from "..";
import { Opcode } from "../enums";
import { UninstallCommitment } from "../ethereum";
import { StateChannel } from "../models";
import { Context, ProtocolMessage, UninstallParams } from "../types";
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
  const {
    appIdentityHash,
    aliceBalanceIncrement,
    bobBalanceIncrement,
    multisigAddress
  } = message.params as UninstallParams;

  const sc = context.stateChannelsMap.get(multisigAddress)!;

  const sequenceNo = sc.getAppInstance(appIdentityHash)!.appSeqNo;

  const newStateChannel = sc.uninstallApp(
    appIdentityHash,
    aliceBalanceIncrement,
    bobBalanceIncrement
  );
  context.stateChannelsMap.set!(multisigAddress, newStateChannel);

  context.commitments[0] = constructUninstallOp(
    context.network,
    newStateChannel,
    sequenceNo
  );

  context.appIdentityHash = appIdentityHash;
}

export function constructUninstallOp(
  network: NetworkContext,
  stateChannel: StateChannel,
  uninstallTargetId: number
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
    uninstallTargetId
  );
}
