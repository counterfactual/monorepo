import { AssetType, NetworkContext } from "@counterfactual/types";

import { InstallCommitment } from "../ethereum";
import { AppInstance, StateChannel } from "../models";
import { Opcode } from "../opcodes";
import { InstallParams, ProtocolMessage } from "../protocol-types-tbd";
import { Context } from "../types";

import { prepareToSendSignature } from "./utils/signature-forwarder";
import { validateSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/05-install-protocol#messages
 *
 */
export const INSTALL_PROTOCOL = {
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
    (message: ProtocolMessage, context: Context, stateChannel: StateChannel) =>
      validateSignature(context.inbox[0], context, stateChannel),

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

    function prepareToSendSignature(
      message: ProtocolMessage,
      context: Context
    ) {
      context.outbox[0] = {
        ...context.outbox[0],
        fromAddress: context.outbox[0].toAddress,
        toAddress: context.outbox[0].fromAddress
      };
    },

    // Send the message to your counterparty
    Opcode.IO_SEND,

    // Consider the state transition finished and commit it
    Opcode.STATE_TRANSITION_COMMIT
  ]
};

function proposeStateTransition(message: ProtocolMessage, context: Context) {
  const {
    aliceBalanceDecrement,
    bobBalanceDecrement,
    signingKeys,
    initialState,
    terms,
    appInterface,
    defaultTimeout,
    multisigAddress
  } = message.params as InstallParams;

  const appInstance = new AppInstance(
    multisigAddress,
    signingKeys,
    defaultTimeout,
    appInterface,
    terms,
    // KEY: Sets it to NOT be a virtual app
    false,
    // KEY: The app sequence number
    // TODO: Should validate that the proposed app sequence number is also
    //       the computed value here and is ALSO still the number compute
    //       inside the installApp function below
    context.stateChannelsMap.get(multisigAddress)!.numInstalledApps + 1,
    context.stateChannelsMap.get(multisigAddress)!.rootNonceValue,
    initialState,
    // KEY: Set the nonce to be 0
    0,
    defaultTimeout
  );

  const newStateChannel = context.stateChannelsMap
    .get(multisigAddress)!
    .installApp(appInstance, aliceBalanceDecrement, bobBalanceDecrement);
  context.stateChannelsMap.set(multisigAddress, newStateChannel);

  const appIdentityHash = appInstance.identityHash;

  context.commitment = constructInstallOp(
    context.network,
    context.stateChannelsMap.get(multisigAddress)!,
    appIdentityHash
  );

  context.appIdentityHash = appIdentityHash;
}

function constructInstallOp(
  network: NetworkContext,
  stateChannel: StateChannel,
  appIdentityHash: string
) {
  const app = stateChannel.getAppInstance(appIdentityHash);

  const freeBalance = stateChannel.getFreeBalanceFor(AssetType.ETH);

  return new InstallCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    app.identity,
    app.terms,
    freeBalance.identity,
    freeBalance.terms,
    freeBalance.hashOfLatestState,
    freeBalance.nonce,
    freeBalance.timeout,
    freeBalance.appSeqNo,
    freeBalance.rootNonceValue
  );
}
