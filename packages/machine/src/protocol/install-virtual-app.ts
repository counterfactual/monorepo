// import { NetworkContext } from "@counterfactual/types";

import { BigNumber } from "ethers/utils";

import { AppInstance, ETHVirtualAppAgreement, StateChannel } from "../models";
import { Opcode } from "../opcodes";
import {
  InstallVirtualAppParams,
  ProtocolMessage
} from "../protocol-types-tbd";
import { Context } from "../types";
import { NetworkContext, AssetType } from "@counterfactual/types";
import { VirtualAppETHAgreementCommitment } from "@counterfactual/machine/src/ethereum/virtual-app-eth-agreement-commitment";

/**
 * @description This exchange is described at the following URL:
 *
 * FIXME: @xuanji pls add
 *
 */
export const INSTALL_VIRTUAL_APP_PROTOCOL = {
  0: [
    proposeStateTransition1,

    // Sign `context.commitment.getHash()`
    Opcode.OP_SIGN,

    (message: ProtocolMessage, context: Context, state: StateChannel) => {
      context.outbox.push({
        ...message,
        signature: context.signature,
        seq: 1
      });
    },

    // send to intermediary
    Opcode.IO_SEND,

    // wait for the install countersign and the setState authorization
    Opcode.IO_WAIT

    /// FIN
  ],

  1: [
    (message: ProtocolMessage, context: Context, state: StateChannel) => {
      context.outbox.push(message);
      context.outbox[0].seq = 2;
      context.outbox[0].fromAddress = message.params.initiatingAddress;
      context.outbox[0].toAddress = message.params.respondingAddress;
    },

    Opcode.IO_SEND,

    // wait for the install countersign
    Opcode.IO_WAIT,

    () => {}

    // send the self-remove
    // Opcode.IO_SEND,
    // Opcode.IO_SEND
  ],

  2: [
    (message: ProtocolMessage, context: Context, state: StateChannel) => {
      context.outbox.push(message);
      context.outbox[0].seq = 3;
      // context.outbox[0].fromAddress = message.data.responding;
      // context.outbox[0].toAddress = message.data.intermediary;
    },

    Opcode.IO_SEND

    // // wait for self-remove
    // Opcode.IO_WAIT
  ]
};

function proposeStateTransition1(
  message: ProtocolMessage,
  context: Context,
  state: StateChannel
) {
  const {
    signingKeys,
    defaultTimeout,
    appInterface,
    initialState,
    aliceBalanceDecrement,
    bobBalanceDecrement,
    terms
  } = message.params as InstallVirtualAppParams;

  const targetAppInstance = new AppInstance(
    "0x00",
    signingKeys,
    defaultTimeout,
    appInterface,
    {
      assetType: 0,
      limit: new BigNumber(0),
      token: ""
    },
    // KEY: Sets it to be a virtual app
    true,
    // KEY: The app sequence number
    // TODO: Should validate that the proposed app sequence number is also
    //       the computed value here and is ALSO still the number compute
    //       inside the installApp function below
    state.numInstalledApps + 1,
    state.rootNonceValue,
    initialState,
    // KEY: Set the app nonce to be 0
    0,
    defaultTimeout
  );
  context.targetVirtualAppInstance = targetAppInstance;

  const ethVirtualAppAgreementInstance = new ETHVirtualAppAgreement(
    state.multisigAddress,
    terms,
    state.numInstalledApps + 1,
    state.rootNonceValue
  );

  context.stateChannel = state.installETHVirtualAppAgreementInstance(
    ethVirtualAppAgreementInstance,
    aliceBalanceDecrement,
    bobBalanceDecrement
  );

  context.commitment = constructAgreementInstallCommitment(
    context.network,
    context.stateChannel,
    targetAppInstance,
    ethVirtualAppAgreementInstance
  );
}

function constructAgreementInstallCommitment(
  network: NetworkContext,
  stateChannel: StateChannel,
  targetAppInstance: AppInstance,
  agreement: ETHVirtualAppAgreement
) {
  const freeBalance = stateChannel.getFreeBalanceFor(AssetType.ETH);

  return new VirtualAppETHAgreementCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    targetAppInstance.identityHash,
    freeBalance.identity,
    freeBalance.terms,
    freeBalance.hashOfLatestState,
    freeBalance.nonce,
    freeBalance.timeout,
    freeBalance.appSeqNo,
    freeBalance.rootNonceValue

  );
}