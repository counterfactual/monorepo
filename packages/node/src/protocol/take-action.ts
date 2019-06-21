import { BaseProvider } from "ethers/providers";

import { SetStateCommitment } from "../ethereum";
import { AppInstanceProtocolExecutionFlow } from "../machine";
import { Opcode, Protocol } from "../machine/enums";
import {
  AppInstanceProtocolContext,
  ProtocolMessage,
  TakeActionParams
} from "../machine/types";
import { xkeyKthAddress } from "../machine/xkeys";

import { validateSignature } from "./utils/signature-validator";

type TakeActionProtocolMessage = ProtocolMessage & { params: TakeActionParams };

/**
 * @description This exchange is described at the following URL:
 *
 * TODO:
 *
 */
export const TAKE_ACTION_PROTOCOL: AppInstanceProtocolExecutionFlow = {
  0: async function*(context: AppInstanceProtocolContext) {
    const { respondingXpub } = context.message.params as TakeActionParams;

    const { appInstance } = context;

    const setStateCommitment = await addStateTransitionAndCommitmentToContext(
      context.message as TakeActionProtocolMessage,
      context,
      context.provider
    );

    const mySig = yield [
      Opcode.OP_SIGN,
      setStateCommitment,
      appInstance.appSeqNo
    ];

    const { signature } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        protocol: Protocol.TakeAction,
        protocolExecutionID: context.message.protocolExecutionID,
        params: context.message.params,
        seq: 1,
        toXpub: respondingXpub,
        signature: mySig
      } as ProtocolMessage
    ];

    validateSignature(
      xkeyKthAddress(respondingXpub, appInstance.appSeqNo),
      setStateCommitment,
      signature
    );
  },

  1: async function*(context: AppInstanceProtocolContext) {
    const setStateCommitment = await addStateTransitionAndCommitmentToContext(
      context.message as TakeActionProtocolMessage,
      context,
      context.provider
    );

    const { signature, params } = context.message;
    const { initiatingXpub } = params as TakeActionParams;

    const { appInstance } = context;

    validateSignature(
      xkeyKthAddress(initiatingXpub, appInstance.appSeqNo),
      setStateCommitment,
      signature
    );

    const mySig = yield [
      Opcode.OP_SIGN,
      setStateCommitment,
      appInstance.appSeqNo
    ];

    yield [
      Opcode.IO_SEND,
      {
        protocol: Protocol.TakeAction,
        protocolExecutionID: context.message.protocolExecutionID,
        toXpub: initiatingXpub,
        seq: -1,
        signature: mySig
      }
    ];
  }
};

async function addStateTransitionAndCommitmentToContext(
  message: TakeActionProtocolMessage,
  context: AppInstanceProtocolContext,
  provider: BaseProvider
): Promise<SetStateCommitment> {
  const { network, appInstance } = context;
  const { action } = message.params as TakeActionParams;

  const updatedAppInstance = appInstance.setState(
    await appInstance.computeStateTransition(action, provider)
  );

  const setStateCommitment = new SetStateCommitment(
    network,
    updatedAppInstance.identity,
    updatedAppInstance.hashOfLatestState,
    updatedAppInstance.nonce,
    updatedAppInstance.timeout
  );

  context.appInstance = updatedAppInstance;

  return setStateCommitment;
}
