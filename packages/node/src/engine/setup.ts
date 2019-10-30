import { UNASSIGNED_SEQ_NO } from "../constants";
import { SetupCommitment } from "../ethereum";
import { StateChannel } from "../models/state-channel";

import { ProtocolExecutionFlow, xkeyKthAddress } from ".";
import { Opcode, Protocol } from "./enums";
import {
  Context,
  ProtocolMessage,
  ProtocolParameters,
  SetupParams
} from "./types";
import { assertIsValidSignature } from "./utils/signature-validator";

const protocol = Protocol.Setup;
const { OP_SIGN, IO_SEND, IO_SEND_AND_WAIT } = Opcode;

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/04-setup-protocol
 */
export const SETUP_PROTOCOL: ProtocolExecutionFlow = {
  0 /* Initiating */: async function*(context: Context) {
    const { message, network, store } = context;

    const {
      sharedData: { stateChannelsMap }
    } = store;

    const { processID, params } = message;

    const {
      multisigAddress,
      responderXpub,
      initiatorXpub
    } = params as SetupParams;

    const stateChannel = StateChannel.setupChannel(
      network.IdentityApp,
      multisigAddress,
      [initiatorXpub, responderXpub]
    );

    const setupCommitment = new SetupCommitment(
      network,
      stateChannel.multisigAddress,
      stateChannel.multisigOwners,
      stateChannel.freeBalance.identity
    );

    const initiatorSignature = yield [OP_SIGN, setupCommitment];

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
      xkeyKthAddress(responderXpub, 0),
      setupCommitment,
      responderSignature
    );

    await store.saveStateChannel(stateChannel);
  },

  1 /* Responding */: async function*(context: Context) {
    const { message, network, store } = context;

    const {
      processID,
      params,
      customData: { signature: initiatorSignature }
    } = message;

    const {
      multisigAddress,
      initiatorXpub,
      responderXpub
    } = params as SetupParams;

    const stateChannel = StateChannel.setupChannel(
      network.IdentityApp,
      multisigAddress,
      [initiatorXpub, responderXpub]
    );

    const setupCommitment = new SetupCommitment(
      network,
      stateChannel.multisigAddress,
      stateChannel.multisigOwners,
      stateChannel.freeBalance.identity
    );

    assertIsValidSignature(
      xkeyKthAddress(initiatorXpub, 0),
      setupCommitment,
      initiatorSignature
    );

    const responderSignature = yield [OP_SIGN, setupCommitment];

    await store.saveStateChannel(stateChannel);

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
