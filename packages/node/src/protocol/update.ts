import { UNASSIGNED_SEQ_NO } from "../constants";
import { SetStateCommitment } from "../ethereum";
import { ProtocolExecutionFlow, xkeyKthAddress } from "../machine";
import { Opcode, Protocol } from "../machine/enums";
import { Context, ProtocolMessage, UpdateParams } from "../machine/types";
import { StateChannel } from "../models";

import { assertIsValidSignature } from "./utils/signature-validator";

const protocol = Protocol.Update;
const { OP_SIGN, IO_SEND, IO_SEND_AND_WAIT } = Opcode;

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/07-update-protocol#messages
 *
 */
export const UPDATE_PROTOCOL: ProtocolExecutionFlow = {
  0 /* Intiating */: async function*(context: Context) {
    const { store, message, network } = context;

    const {
      sharedData: { stateChannelsMap }
    } = store;

    const { processID, params } = message;

    const {
      appIdentityHash,
      multisigAddress,
      responderXpub,
      newState
    } = params as UpdateParams;

    const preProtocolStateChannel = StateChannel.fromJson(
      stateChannelsMap[multisigAddress]
    );

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

    await store.saveStateChannel(postProtocolStateChannel);
  },

  1 /* Responding */: async function*(context: Context) {
    const { store, message, network } = context;

    const {
      sharedData: { stateChannelsMap }
    } = store;

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

    const preProtocolStateChannel = StateChannel.fromJson(
      stateChannelsMap[multisigAddress]
    );

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

    await store.saveStateChannel(postProtocolStateChannel);

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
  }
};
