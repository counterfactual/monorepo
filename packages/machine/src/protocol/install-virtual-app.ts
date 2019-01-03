// import { NetworkContext } from "@counterfactual/types";

import { ETHVirtualAppAgreementCommitment } from "@counterfactual/machine/src/ethereum/eth-virtual-app-agreement-commitment";
import { VirtualAppSetStateCommitment } from "@counterfactual/machine/src/ethereum/virtual-app-set-state-commitment";
import { AssetType, NetworkContext } from "@counterfactual/types";
import { BigNumber } from "ethers/utils";

import {
  AppInstance,
  ETHVirtualAppAgreementInstance,
  StateChannel
} from "../models";
import { Opcode } from "../opcodes";
import {
  InstallVirtualAppParams,
  ProtocolMessage
} from "../protocol-types-tbd";
import { Context } from "../types";

// hardcoded assumption: all installed virtual apps can go through this many update operations
const NONCE_EXPIRY = 65536;

/**
 * @description This exchange is described at the following URL:
 */
export const INSTALL_VIRTUAL_APP_PROTOCOL = {
  0: [
    proposeStateTransition1,

    // Sign `context.commitment.getHash()` and `context.commitment2.getHash(false)`
    Opcode.OP_SIGN,

    // M1
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox.push({
        ...message,
        signature: context.signature, // s1
        signature2: context.signature2, // s5
        seq: 1,
        toAddress: params2.intermediaryAddress
      });
    },
    Opcode.IO_SEND,

    // wait for M5
    Opcode.IO_WAIT
  ],

  1: [
    proposeStateTransition2,

    // Sign three commitments; pass `true` to hashToSign if asked
    Opcode.OP_SIGN,

    // M2
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox[0] = message;
      context.outbox[0].seq = 2;
      context.outbox[0].fromAddress = params2.intermediaryAddress;
      context.outbox[0].toAddress = params2.respondingAddress;
      context.outbox[0].signature = message.signature2; // s5
      context.outbox[0].signature2 = context.signature; // s3
    },
    Opcode.IO_SEND,

    // wait for M3
    Opcode.IO_WAIT,

    // M4
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox[0] = message;
      context.outbox[0].seq = 4;
      context.outbox[0].fromAddress = params2.intermediaryAddress;
      context.outbox[0].toAddress = params2.respondingAddress;
      context.outbox[0].signature = context.signature3; // s6
    },
    Opcode.IO_SEND,

    // M5
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox[0] = message;
      context.outbox[0].seq = 5;
      context.outbox[0].fromAddress = params2.intermediaryAddress;
      context.outbox[0].toAddress = params2.initiatingAddress;
      context.outbox[0].signature = context.signature3; // s6
      context.outbox[0].signature2 = context.signature2; // s2
      context.outbox[0].signature3 = context.inbox[0].signature2; // s7
    },
    Opcode.IO_SEND
  ],

  2: [
    proposeStateTransition3,

    // Sign two commitments
    Opcode.OP_SIGN,

    // M3
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox[0] = message;
      context.outbox[0].seq = 3;
      context.outbox[0].fromAddress = params2.respondingAddress;
      context.outbox[0].toAddress = params2.intermediaryAddress;
      context.outbox[0].signature = context.signature; // s4
      context.outbox[0].signature2 = context.signature2; // s7
    },

    Opcode.IO_SEND,

    // wait for M4
    Opcode.IO_WAIT
  ]
};

function proposeStateTransition3(message: ProtocolMessage, context: Context) {
  const {
    signingKeys,
    defaultTimeout,
    appInterface,
    initialState,
    aliceBalanceDecrement,
    bobBalanceDecrement,
    terms,
    multisig2Address
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
    0, // virtual app instances do not have appSeqNo
    0, // or rootNonceValue
    initialState,
    // KEY: Set the app nonce to be 0
    0,
    defaultTimeout
  );
  context.targetVirtualAppInstance = targetAppInstance;

  const rightEthVirtualAppAgreementInstance = new ETHVirtualAppAgreementInstance(
    context.stateChannel.get(multisig2Address)!.multisigAddress,
    terms,
    context.stateChannel.get(multisig2Address)!.numInstalledApps + 1,
    context.stateChannel.get(multisig2Address)!.rootNonceValue,
    100,
    aliceBalanceDecrement.add(bobBalanceDecrement).toNumber()
  );

  const newStateChannel = context.stateChannel
    .get(multisig2Address)!
    .installETHVirtualAppAgreementInstance(
      rightEthVirtualAppAgreementInstance,
      aliceBalanceDecrement,
      bobBalanceDecrement
    );
  context.stateChannel.set(multisig2Address, newStateChannel);

  // s4
  context.commitment = constructETHVirtualAppAgreementCommitment(
    context.network,
    newStateChannel,
    targetAppInstance.identityHash,
    rightEthVirtualAppAgreementInstance
  );

  // s7
  context.commitment2 = new VirtualAppSetStateCommitment(
    context.network,
    targetAppInstance.identity,
    NONCE_EXPIRY,
    targetAppInstance.defaultTimeout,
    targetAppInstance.hashOfLatestState,
    0
  );
}

function proposeStateTransition1(message: ProtocolMessage, context: Context) {
  const {
    signingKeys,
    defaultTimeout,
    appInterface,
    initialState,
    aliceBalanceDecrement,
    bobBalanceDecrement,
    terms,
    multisig1Address
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
    0, // virtual app instances do not have appSeqNo
    0, // or rootNonceValue
    initialState,
    // KEY: Set the app nonce to be 0
    0,
    defaultTimeout
  );
  context.targetVirtualAppInstance = targetAppInstance;

  const leftETHVirtualAppAgreementInstance = new ETHVirtualAppAgreementInstance(
    context.stateChannel.get(multisig1Address)!.multisigAddress,
    terms,
    context.stateChannel.get(multisig1Address)!.numInstalledApps + 1,
    context.stateChannel.get(multisig1Address)!.rootNonceValue,
    100,
    aliceBalanceDecrement.add(bobBalanceDecrement).toNumber()
  );

  const newStateChannel = context.stateChannel
    .get(multisig1Address)!
    .installETHVirtualAppAgreementInstance(
      leftETHVirtualAppAgreementInstance,
      aliceBalanceDecrement,
      bobBalanceDecrement
    );
  context.stateChannel.set(multisig1Address, newStateChannel);

  context.commitment = constructETHVirtualAppAgreementCommitment(
    context.network,
    newStateChannel,
    targetAppInstance.identityHash,
    leftETHVirtualAppAgreementInstance
  );

  context.commitment2 = new VirtualAppSetStateCommitment(
    context.network,
    targetAppInstance.identity,
    NONCE_EXPIRY,
    targetAppInstance.defaultTimeout,
    targetAppInstance.hashOfLatestState,
    0
  );
}

function constructETHVirtualAppAgreementCommitment(
  network: NetworkContext,
  stateChannel: StateChannel,
  targetHash: string,
  ethVirtualAppAgreementInstance: ETHVirtualAppAgreementInstance
) {
  const freeBalance = stateChannel.getFreeBalanceFor(AssetType.ETH);

  return new ETHVirtualAppAgreementCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    targetHash,
    freeBalance.identity,
    freeBalance.terms,
    freeBalance.hashOfLatestState,
    freeBalance.nonce,
    freeBalance.timeout,
    freeBalance.appSeqNo,
    freeBalance.rootNonceValue,
    new BigNumber(ethVirtualAppAgreementInstance.expiry),
    new BigNumber(ethVirtualAppAgreementInstance.capitalProvided),
    []
  );
}

function proposeStateTransition2(message: ProtocolMessage, context: Context) {
  const {
    multisig1Address,
    multisig2Address,
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
    0, // virtual app instances do not have appSeqNo
    0, // or rootNonceValue
    initialState,
    // KEY: Set the app nonce to be 0
    0,
    defaultTimeout
  );

  const leftEthVirtualAppAgreementInstance = new ETHVirtualAppAgreementInstance(
    context.stateChannel.get(multisig1Address)!.multisigAddress,
    terms,
    context.stateChannel.get(multisig1Address)!.numInstalledApps + 1,
    context.stateChannel.get(multisig1Address)!.rootNonceValue,
    100,
    aliceBalanceDecrement.add(bobBalanceDecrement).toNumber()
  );

  const rightEthVirtualAppAgreementInstance = new ETHVirtualAppAgreementInstance(
    context.stateChannel.get(multisig2Address)!.multisigAddress,
    terms,
    context.stateChannel.get(multisig2Address)!.numInstalledApps + 1,
    context.stateChannel.get(multisig2Address)!.rootNonceValue,
    100,
    aliceBalanceDecrement.add(bobBalanceDecrement).toNumber()
  );

  // S2
  context.commitment = constructETHVirtualAppAgreementCommitment(
    context.network,
    context.stateChannel.get(multisig1Address)!,
    targetAppInstance.identityHash,
    leftEthVirtualAppAgreementInstance
  );

  // S3
  context.commitment2 = constructETHVirtualAppAgreementCommitment(
    context.network,
    context.stateChannel.get(multisig1Address)!,
    targetAppInstance.identityHash,
    rightEthVirtualAppAgreementInstance
  );

  // S6
  const newStateChannel1 = context.stateChannel
    .get(multisig1Address)!
    .installETHVirtualAppAgreementInstance(
      leftEthVirtualAppAgreementInstance,
      aliceBalanceDecrement,
      bobBalanceDecrement
    );
  context.stateChannel.set(multisig1Address, newStateChannel1);

  const newStateChannel2 = context.stateChannel
    .get(multisig2Address)!
    .installETHVirtualAppAgreementInstance(
      leftEthVirtualAppAgreementInstance,
      aliceBalanceDecrement,
      bobBalanceDecrement
    );
  context.stateChannel.set(multisig2Address, newStateChannel2);

  context.commitment3 = new VirtualAppSetStateCommitment(
    context.network,
    targetAppInstance.identity,
    NONCE_EXPIRY,
    targetAppInstance.defaultTimeout,
    "",
    0
  );
}
