import { NetworkContext } from "@counterfactual/types";

import { SetupCommitment } from "../ethereum";
import { ProtocolExecutionFlow, xkeyKthAddress } from "../machine";
import { Opcode, Protocol } from "../machine/enums";
import {
  Context,
  ProtocolMessage,
  ProtocolParameters,
  SetupParams
} from "../machine/types";
import { StateChannel } from "../models/state-channel";

import { UNASSIGNED_SEQ_NO } from "./utils/signature-forwarder";
import { assertIsValidSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/04-setup-protocol
 */
export const SETUP_PROTOCOL: ProtocolExecutionFlow = {
  0: async function*(context: Context) {
    const { responderXpub, multisigAddress } = context.message
      .params as SetupParams;
    const responderAddress = xkeyKthAddress(responderXpub, 0);
    const setupCommitment = proposeStateTransition(
      context.message.params,
      context
    );

    const mySignature = yield [Opcode.OP_SIGN, setupCommitment];

    const { signature: counterpartySignature } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        protocol: Protocol.Setup,
        protocolExecutionID: context.message.protocolExecutionID,
        params: context.message.params,
        toXpub: responderXpub,
        signature: mySignature,
        seq: 1
      } as ProtocolMessage
    ];
    assertIsValidSignature(
      responderAddress,
      setupCommitment,
      counterpartySignature
    );

    const finalCommitment = setupCommitment.getSignedTransaction([
      mySignature,
      counterpartySignature
    ]);

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Setup,
      finalCommitment,
      multisigAddress
    ];
  },

  1: async function*(context: Context) {
    const { initiatorXpub, multisigAddress } = context.message
      .params as SetupParams;
    const initiatorAddress = xkeyKthAddress(initiatorXpub, 0);

    const setupCommitment = proposeStateTransition(
      context.message.params,
      context
    );

    const counterpartySignature = context.message.signature!;
    assertIsValidSignature(
      initiatorAddress,
      setupCommitment,
      counterpartySignature
    );

    const mySignature = yield [Opcode.OP_SIGN, setupCommitment];

    const finalCommitment = setupCommitment.getSignedTransaction([
      mySignature,
      counterpartySignature
    ]);
    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Setup,
      finalCommitment,
      multisigAddress
    ];

    yield [
      Opcode.IO_SEND,
      {
        protocol: Protocol.Setup,
        protocolExecutionID: context.message.protocolExecutionID,
        toXpub: initiatorXpub,
        signature: mySignature,
        seq: UNASSIGNED_SEQ_NO
      } as ProtocolMessage
    ];
  }
};

function proposeStateTransition(
  params: ProtocolParameters,
  context: Context
): SetupCommitment {
  const {
    multisigAddress,
    initiatorXpub,
    responderXpub
  } = params as SetupParams;

  if (context.stateChannelsMap.has(multisigAddress)) {
    throw new Error(`Found an already-setup channel at ${multisigAddress}`);
  }

  const newStateChannel = StateChannel.setupChannel(
    context.network.IdentityApp,
    multisigAddress,
    [initiatorXpub, responderXpub]
  );

  context.stateChannelsMap.set(
    newStateChannel.multisigAddress,
    newStateChannel
  );

  const setupCommitment = constructSetupCommitment(
    context.network,
    newStateChannel
  );

  return setupCommitment;
}

export function constructSetupCommitment(
  network: NetworkContext,
  stateChannel: StateChannel
) {
  const freeBalance = stateChannel.freeBalance;

  return new SetupCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    freeBalance.identity
  );
}
