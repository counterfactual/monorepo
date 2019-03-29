import { AssetType, NetworkContext } from "@counterfactual/types";

import { ProtocolExecutionFlow } from "..";
import { Opcode, Protocol } from "../enums";
import { SetupCommitment } from "../ethereum";
import { StateChannel } from "../models/state-channel";
import { Context, ProtocolParameters, SetupParams } from "../types";
import { xkeyKthAddress } from "../xkeys";

import { UNASSIGNED_SEQ_NO } from "./utils/signature-forwarder";
import { validateSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/04-setup-protocol
 */
export const SETUP_PROTOCOL: ProtocolExecutionFlow = {
  0: async function*(context: Context) {
    const { respondingXpub, multisigAddress } = context.message
      .params as SetupParams;
    const respondingAddress = xkeyKthAddress(respondingXpub, 0);
    const setupCommitment = proposeStateTransition(
      context.message.params,
      context
    );
    const mySig = yield [Opcode.OP_SIGN, setupCommitment];

    const { signature: theirSig } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        ...context.message,
        toXpub: respondingXpub,
        signature: mySig,
        seq: 1
      }
    ];
    validateSignature(respondingAddress, setupCommitment, theirSig);

    const finalCommitment = setupCommitment.transaction([mySig, theirSig]);

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Setup,
      finalCommitment,
      multisigAddress
    ];
  },

  1: async function*(context: Context) {
    const { initiatingXpub, multisigAddress } = context.message
      .params as SetupParams;
    const initiatingAddress = xkeyKthAddress(initiatingXpub, 0);

    const setupCommitment = proposeStateTransition(
      context.message.params,
      context
    );

    const theirSig = context.message.signature!;
    validateSignature(initiatingAddress, setupCommitment, theirSig);

    const mySig = yield [Opcode.OP_SIGN, setupCommitment];

    const finalCommitment = setupCommitment.transaction([mySig, theirSig]);
    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Setup,
      finalCommitment,
      multisigAddress
    ];

    yield [
      Opcode.IO_SEND,
      {
        ...context.message,
        toXpub: initiatingXpub,
        signature: mySig,
        seq: UNASSIGNED_SEQ_NO
      }
    ];
  }
};

function proposeStateTransition(
  params: ProtocolParameters,
  context: Context
): SetupCommitment {
  const {
    multisigAddress,
    initiatingXpub,
    respondingXpub
  } = params as SetupParams;

  if (context.stateChannelsMap.has(multisigAddress)) {
    throw Error(`Found an already-setup channel at ${multisigAddress}`);
  }

  const newStateChannel = StateChannel.setupChannel(
    context.network.ETHBucket,
    multisigAddress,
    [initiatingXpub, respondingXpub]
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
  const freeBalance = stateChannel.getFreeBalanceFor(AssetType.ETH);

  return new SetupCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    freeBalance.identity,
    freeBalance.terms
  );
}
