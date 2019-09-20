import { SetStateCommitment } from "../ethereum";
import { ProtocolExecutionFlow } from "../engine";
import { Opcode, Protocol } from "../engine/enums";
import { Context, ProtocolMessage, UpdateParams } from "../engine/types";
import { xkeyKthAddress } from "../engine/xkeys";

import { UNASSIGNED_SEQ_NO } from "./utils/signature-forwarder";
import { assertIsValidSignature } from "./utils/signature-validator";

const protocol = Protocol.Update;
const { OP_SIGN, IO_SEND, IO_SEND_AND_WAIT, PERSIST_STATE_CHANNEL } = Opcode;

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/07-update-protocol#messages
 *
 */
export const UPDATE_PROTOCOL: ProtocolExecutionFlow = {
  0 /* Intiating */: async function*(context: Context) {
    const { stateChannelsMap, message, network } = context;

    const { processID, params } = message;

    const {
      appIdentityHash,
      multisigAddress,
      responderXpub,
      newState
    } = params as UpdateParams;

    const preProtocolStateChannel = stateChannelsMap.get(multisigAddress)!;

    const postProtocolStateChannel = preProtocolStateChannel.setState(
      appIdentityHash,
      newState
    );

    const appInstance = postProtocolStateChannel.getAppInstance(
      appIdentityHash
    );

    const setStateCommitment = new SetStateCommitment(
      network,
      appInstance.identity,
      appInstance.hashOfLatestState,
      appInstance.versionNumber,
      appInstance.timeout
    );

    const initiatorSignature = yield [
      OP_SIGN,
      setStateCommitment,
      appInstance.appSeqNo
    ];

    const {
      customData: { signature: responderSignature }
    } = yield [
      IO_SEND_AND_WAIT,
      {
        protocol,
        processID,
        params,
        seq: 1,
        toXpub: responderXpub,
        customData: {
          signature: initiatorSignature
        }
      } as ProtocolMessage
    ];

    assertIsValidSignature(
      xkeyKthAddress(responderXpub, appInstance.appSeqNo),
      setStateCommitment,
      responderSignature
    );

    yield [PERSIST_STATE_CHANNEL, [postProtocolStateChannel]];

    context.stateChannelsMap.set(
      postProtocolStateChannel.multisigAddress,
      postProtocolStateChannel
    );
  },

  1 /* Responding */: async function*(context: Context) {
    const { stateChannelsMap, message, network } = context;

    const {
      processID,
      params,
      customData: { signature: initiatorSignature }
    } = message;

    const {
      appIdentityHash,
      multisigAddress,
      initiatorXpub,
      newState
    } = params as UpdateParams;

    const preProtocolStateChannel = stateChannelsMap.get(multisigAddress)!;

    const postProtocolStateChannel = preProtocolStateChannel.setState(
      appIdentityHash,
      newState
    );

    const appInstance = postProtocolStateChannel.getAppInstance(
      appIdentityHash
    );

    const setStateCommitment = new SetStateCommitment(
      network,
      appInstance.identity,
      appInstance.hashOfLatestState,
      appInstance.versionNumber,
      appInstance.timeout
    );

    assertIsValidSignature(
      xkeyKthAddress(initiatorXpub, appInstance.appSeqNo),
      setStateCommitment,
      initiatorSignature
    );

    const responderSignature = yield [
      OP_SIGN,
      setStateCommitment,
      appInstance.appSeqNo
    ];

    yield [PERSIST_STATE_CHANNEL, [postProtocolStateChannel]];

    yield [
      IO_SEND,
      {
        protocol,
        processID,
        toXpub: initiatorXpub,
        seq: UNASSIGNED_SEQ_NO,
        customData: {
          signature: responderSignature
        }
      } as ProtocolMessage
    ];

    context.stateChannelsMap.set(
      postProtocolStateChannel.multisigAddress,
      postProtocolStateChannel
    );
  }
};
