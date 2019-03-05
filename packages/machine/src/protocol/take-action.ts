import { setFinalCommitment } from "@counterfactual/machine/src/protocol/utils/set-final-commitment";
import { BaseProvider } from "ethers/providers";

import { ProtocolExecutionFlow } from "..";
import { Opcode } from "../enums";
import { SetStateCommitment } from "../ethereum";
import { StateChannel } from "../models/state-channel";
import { Context, ProtocolMessage, TakeActionParams } from "../types";
import { xkeyKthAddress } from "../xkeys";

import { verifyInboxLengthEqualTo1 } from "./utils/inbox-validator";
import {
  addSignedCommitmentInResponse,
  addSignedCommitmentToOutboxForSeq1
} from "./utils/signature-forwarder";
import { validateSignature } from "./utils/signature-validator";

type TakeActionProtocolMessage = ProtocolMessage & { params: TakeActionParams };

/**
 * @description This exchange is described at the following URL:
 *
 * TODO:
 *
 */
export const TAKE_ACTION_PROTOCOL: ProtocolExecutionFlow = {
  0: [
    // Compute the next state of the channel
    addStateTransitionAndCommitmentToContext,

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
    (message: TakeActionProtocolMessage, context: Context) => {
      const { toXpub } = message;
      const { stateChannelsMap } = context;
      const { appIdentityHash, multisigAddress } = message.params;

      const channel = stateChannelsMap.get(multisigAddress) as StateChannel;
      const appSeqNo = channel.getAppInstance(appIdentityHash).appSeqNo;

      validateSignature(
        xkeyKthAddress(toXpub, appSeqNo),
        context.commitments[0],
        context.inbox[0].signature
      );
    },

    setFinalCommitment(true),

    Opcode.WRITE_COMMITMENT
  ],

  1: [
    // Compute the _proposed_ next state of the channel
    addStateTransitionAndCommitmentToContext,

    // Validate your counterparty's signature is for the above proposal
    (message: TakeActionProtocolMessage, context: Context) => {
      const { signature, fromXpub, params } = message;
      const { appIdentityHash, multisigAddress } = params;

      const sc = context.stateChannelsMap.get(multisigAddress) as StateChannel;
      const appSeqNo = sc.getAppInstance(appIdentityHash).appSeqNo;

      validateSignature(
        xkeyKthAddress(fromXpub, appSeqNo),
        context.commitments[0],
        signature
      );
    },

    // Sign the same state update yourself
    Opcode.OP_SIGN,

    setFinalCommitment(false),

    Opcode.WRITE_COMMITMENT,

    // Wrap the signature into a message to be sent
    addSignedCommitmentInResponse,

    // Send the message to your counterparty
    Opcode.IO_SEND
  ]
};

async function addStateTransitionAndCommitmentToContext(
  message: TakeActionProtocolMessage,
  context: Context,
  provider: BaseProvider
) {
  const { network, stateChannelsMap } = context;
  const { appIdentityHash, action, multisigAddress } = message.params;

  const stateChannel = stateChannelsMap.get(multisigAddress) as StateChannel;

  const appInstance = stateChannel.getAppInstance(appIdentityHash);

  const newChannel = stateChannel.setState(
    appIdentityHash,
    await appInstance.computeStateTransition(action, provider)
  );

  const updatedAppInstance = newChannel.getAppInstance(appIdentityHash);

  const setStateCommitment = new SetStateCommitment(
    network,
    updatedAppInstance.identity,
    updatedAppInstance.hashOfLatestState,
    updatedAppInstance.nonce,
    updatedAppInstance.timeout
  );

  context.stateChannelsMap.set(multisigAddress, newChannel);
  context.commitments[0] = setStateCommitment;
  context.appIdentityHash = appIdentityHash;
}
