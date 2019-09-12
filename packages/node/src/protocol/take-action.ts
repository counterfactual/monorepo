import { SetStateCommitment } from "../ethereum";
import { ProtocolExecutionFlow } from "../machine";
import { Opcode, Protocol } from "../machine/enums";
import { Context, ProtocolMessage, TakeActionParams } from "../machine/types";
import { xkeyKthAddress } from "../machine/xkeys";

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
  0: async function*(context: Context) {
    const { stateChannelsMap, provider, message, network } = context;

    const { processID, params } = message;

    const {
      appIdentityHash,
      multisigAddress,
      responderXpub,
      action
    } = params as TakeActionParams;

    const preProtocolStateChannel = stateChannelsMap.get(multisigAddress)!;

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

    context.stateChannelsMap.set(
      postProtocolStateChannel.multisigAddress,
      postProtocolStateChannel
    );
  },

  1: async function*(context: Context) {
    const { stateChannelsMap, provider, message, network } = context;

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

    const preProtocolStateChannel = stateChannelsMap.get(multisigAddress)!;

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

    yield [
      IO_SEND,
      {
        protocol,
        processID,
        toXpub: initiatorXpub,
        seq: -1,
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
