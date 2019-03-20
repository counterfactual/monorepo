import { NetworkContext } from "@counterfactual/types";

import { ProtocolExecutionFlow } from "..";
import { Opcode, Protocol } from "../enums";
import { SetStateCommitment } from "../ethereum";
import { StateChannel } from "../models/state-channel";
import { Context, ProtocolMessage, UpdateParams } from "../types";
import { xkeyKthAddress } from "../xkeys";

import { UNASSIGNED_SEQ_NO } from "./utils/signature-forwarder";
import { validateSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/07-update-protocol#messages
 *
 */
export const UPDATE_PROTOCOL: ProtocolExecutionFlow = {
  0: async function*(message: ProtocolMessage, context: Context) {
    const { respondingXpub } = message.params;

    const [
      appIdentityHash,
      setStateCommitment,
      appSeqNo
    ] = proposeStateTransition(message, context);

    const mySig = yield [Opcode.OP_SIGN, setStateCommitment, appSeqNo];

    const { signature: theirSig } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        ...message,
        toXpub: respondingXpub,
        signature: mySig,
        seq: 1
      }
    ];

    validateSignature(
      xkeyKthAddress(respondingXpub, appSeqNo),
      setStateCommitment,
      theirSig
    );

    const finalCommitment = setStateCommitment.transaction([mySig, theirSig]);
    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      finalCommitment,
      appIdentityHash
    ];
  },

  1: async function*(message: ProtocolMessage, context: Context) {
    const [
      appIdentityHash,
      setStateCommitment,
      appSeqNo
    ] = proposeStateTransition(message, context);

    const { initiatingXpub } = message.params;

    const theirSig = message.signature!;

    validateSignature(
      xkeyKthAddress(initiatingXpub, appSeqNo),
      setStateCommitment,
      theirSig
    );

    const mySig = yield [Opcode.OP_SIGN, setStateCommitment, appSeqNo];

    const finalCommitment = setStateCommitment.transaction([mySig, theirSig]);
    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      finalCommitment,
      appIdentityHash
    ];

    yield [
      Opcode.IO_SEND,
      {
        ...message,
        toXpub: initiatingXpub,
        signature: mySig,
        seq: UNASSIGNED_SEQ_NO
      }
    ];
  }
};

function proposeStateTransition(
  message: ProtocolMessage,
  context: Context
): [string, SetStateCommitment, number] {
  const {
    appIdentityHash,
    newState,
    multisigAddress
  } = message.params as UpdateParams;
  const newStateChannel = context.stateChannelsMap
    .get(multisigAddress)!
    .setState(appIdentityHash, newState);
  context.stateChannelsMap.set(
    newStateChannel.multisigAddress,
    newStateChannel
  );
  const setStateCommitment = constructUpdateOp(
    context.network,
    newStateChannel,
    appIdentityHash
  );
  const appSeqNo = context.stateChannelsMap
    .get(multisigAddress)!
    .getAppInstance(appIdentityHash).appSeqNo;

  return [appIdentityHash, setStateCommitment, appSeqNo];
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
