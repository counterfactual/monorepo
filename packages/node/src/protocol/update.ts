import { NetworkContext } from "@counterfactual/types";

import { SetStateCommitment } from "../ethereum";
import { AppInstanceProtocolExecutionFlow } from "../machine";
import { Opcode, Protocol } from "../machine/enums";
import {
  AppInstanceProtocolContext,
  ProtocolMessage,
  ProtocolParameters,
  UpdateParams
} from "../machine/types";
import { xkeyKthAddress } from "../machine/xkeys";
import { AppInstance } from "../models";

import { UNASSIGNED_SEQ_NO } from "./utils/signature-forwarder";
import { validateSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/07-update-protocol#messages
 *
 */
export const UPDATE_PROTOCOL: AppInstanceProtocolExecutionFlow = {
  0: async function*(context: AppInstanceProtocolContext) {
    const { respondingXpub } = context.message.params;

    const [
      appIdentityHash,
      setStateCommitment,
      appSeqNo
    ] = proposeStateTransition(context.message.params, context);

    const mySig = yield [Opcode.OP_SIGN, setStateCommitment, appSeqNo];

    const { signature: theirSig } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        protocol: Protocol.Update,
        protocolExecutionID: context.message.protocolExecutionID,
        params: context.message.params,
        toXpub: respondingXpub,
        signature: mySig,
        seq: 1
      } as ProtocolMessage
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

  1: async function*(context: AppInstanceProtocolContext) {
    const [
      appIdentityHash,
      setStateCommitment,
      appSeqNo
    ] = proposeStateTransition(context.message.params, context);

    const { initiatingXpub } = context.message.params;

    const theirSig = context.message.signature!;

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
        protocol: Protocol.Update,
        protocolExecutionID: context.message.protocolExecutionID,
        toXpub: initiatingXpub,
        signature: mySig,
        seq: UNASSIGNED_SEQ_NO
      } as ProtocolMessage
    ];
  }
};

function proposeStateTransition(
  params: ProtocolParameters,
  context: AppInstanceProtocolContext
): [string, SetStateCommitment, number] {
  const { newState } = params as UpdateParams;

  const newAppInstance = context.appInstance.setState(newState);

  context.appInstance = newAppInstance;

  const setStateCommitment = constructUpdateOp(context.network, newAppInstance);

  return [
    newAppInstance.identityHash,
    setStateCommitment,
    newAppInstance.appSeqNo
  ];
}

function constructUpdateOp(network: NetworkContext, appInstance: AppInstance) {
  return new SetStateCommitment(
    network,
    appInstance.identity,
    appInstance.hashOfLatestState,
    appInstance.nonce,
    appInstance.timeout
  );
}
