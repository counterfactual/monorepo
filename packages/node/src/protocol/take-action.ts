import { UNASSIGNED_SEQ_NO } from "../constants";
import { SetStateCommitment } from "../ethereum";
import { Opcode, Protocol } from "../machine/enums";
import {
  Context,
  ProtocolExecutionFlow,
  ProtocolMessage,
  TakeActionParams
} from "../machine/types";
import { xkeyKthAddress } from "../machine/xkeys";
import { StateChannel } from "../models/state-channel";

import { assertIsValidSignature } from "./utils/signature-validator";

const protocol = Protocol.TakeAction;
const { OP_SIGN, IO_SEND, IO_SEND_AND_WAIT } = Opcode;

/**
 * @description This exchange is described at the following URL:
 *
 * TODO:
 *
 */
export const TAKE_ACTION_PROTOCOL: ProtocolExecutionFlow = {
  0 /* Initiating */: async function*(context: Context) {
    const { store, provider, message, network } = context;

    const {
      sharedData: { stateChannelsMap }
    } = store;

    const { processID, params } = message;

    const {
      appIdentityHash,
      multisigAddress,
      responderXpub,
      action
    } = params as TakeActionParams;

    const preProtocolStateChannel = StateChannel.fromJson(
      stateChannelsMap[multisigAddress]
    );

    const postProtocolStateChannel = preProtocolStateChannel.setState(
      appIdentityHash,
      await preProtocolStateChannel
        .getAppInstance(appIdentityHash)
        .computeStateTransition(action, provider)
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
    const { store, provider, message, network } = context;

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
      action
    } = params as TakeActionParams;

    const preProtocolStateChannel = StateChannel.fromJson(
      stateChannelsMap[multisigAddress]
    );

    const postProtocolStateChannel = preProtocolStateChannel.setState(
      appIdentityHash,
      await preProtocolStateChannel
        .getAppInstance(appIdentityHash)
        .computeStateTransition(action, provider)
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
