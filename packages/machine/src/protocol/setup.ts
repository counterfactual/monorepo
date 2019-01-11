import { AssetType, NetworkContext } from "@counterfactual/types";

import { SetupCommitment } from "../ethereum";
import { StateChannel } from "../models/state-channel";
import { Opcode } from "../opcodes";
import { ProtocolMessage, SetupParams } from "../protocol-types-tbd";
import { Context } from "../types";

import { prepareToSendSignature } from "./utils/signature-forwarder";
import { validateSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/04-setup-protocol#messages
 *
 */
export const SETUP_PROTOCOL = {
  0: [
    // Compute the next state of the channel
    proposeStateTransition,

    // Sign `context.commitment.hashToSign`
    Opcode.OP_SIGN,

    // Wrap the signature into a message to be sent
    prepareToSendSignature,

    // Send the message to your counterparty
    Opcode.IO_SEND,

    // Wait for them to countersign the message
    Opcode.IO_WAIT,

    // Verify they did indeed countersign the right thing
    validateSignature,

    // Consider the state transition finished and commit it
    Opcode.STATE_TRANSITION_COMMIT
  ],

  1: [
    // Compute the _proposed_ next state of the channel
    proposeStateTransition,

    // Validate your counterparties signature is for the above proposal
    validateSignature,

    // Sign the same state update yourself
    Opcode.OP_SIGN,

    // Wrap the signature into a message to be sent
    prepareToSendSignature,

    // Send the message to your counterparty
    Opcode.IO_SEND,

    // Consider the state transition finished and commit it
    Opcode.STATE_TRANSITION_COMMIT
  ]
};

function proposeStateTransition(message: ProtocolMessage, context: Context) {
  const { multisigAddress } = message.params as SetupParams;
  const sc = context.stateChannelsMap.get(multisigAddress)!;
  if (sc === undefined) {
    console.log("sc keys=", context.stateChannelsMap.keys());
    throw Error(`no such channel at multisig address ${multisigAddress}`);
  }
  const newStateChannel = sc.setupChannel(context.network);
  context.stateChannelsMap.set(multisigAddress, newStateChannel);
  context.commitment = constructSetupOp(context.network, newStateChannel);
}

export function constructSetupOp(
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
