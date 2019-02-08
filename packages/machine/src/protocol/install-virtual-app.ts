import { ETHVirtualAppAgreementCommitment } from "@counterfactual/machine/src/ethereum/eth-virtual-app-agreement-commitment";
import { VirtualAppSetStateCommitment } from "@counterfactual/machine/src/ethereum/virtual-app-set-state-commitment";
import { AppInterface, AssetType, NetworkContext } from "@counterfactual/types";
import { AddressZero, HashZero, Zero } from "ethers/constants";
import { BigNumber } from "ethers/utils";

import { ProtocolExecutionFlow } from "..";
import { Opcode } from "../enums";
import {
  AppInstance,
  ETHVirtualAppAgreementInstance,
  StateChannel
} from "../models";
import {
  Context,
  InstallVirtualAppParams,
  ProtocolMessage,
  SolidityABIEncoderV2Struct
} from "../types";
import { virtualChannelKey } from "../virtual-app-key";

import { getChannelFromCounterparty } from "./utils/get-channel-from-counterparty";

// hardcoded assumption: all installed virtual apps can go through this many update operations
const NONCE_EXPIRY = 65536;

// TODO: Add signature validation

/**
 * @description This exchange is described at the following URL:
 * https://specs.counterfactual.com/09-install-virtual-app-protocol
 */
export const INSTALL_VIRTUAL_APP_PROTOCOL: ProtocolExecutionFlow = {
  0: [
    proposeStateTransition1,

    // Sign `context.commitment.getHash()` and `context.commitment2.getHash(false)`
    Opcode.OP_SIGN,

    // M1
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox.push({
        ...message,
        signature: context.signatures[0], // s1
        signature2: context.signatures[1], // s5
        seq: 1,
        toAddress: params2.intermediaryAddress
      });
    },

    // wait for M5
    Opcode.IO_SEND_AND_WAIT,

    Opcode.STATE_TRANSITION_COMMIT
  ],

  1: [
    proposeStateTransition2,

    // Sign three commitments; pass `true` to hashToSign if asked
    Opcode.OP_SIGN_AS_INTERMEDIARY,

    // M2
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox[0] = {
        ...message,
        seq: 2,
        fromAddress: params2.intermediaryAddress,
        toAddress: params2.respondingAddress,
        signature: message.signature2, // s5
        signature2: context.signatures[0] // s3
      };
    },

    // wait for M3
    Opcode.IO_SEND_AND_WAIT,

    // M4
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox[0] = {
        ...message,
        seq: -1,
        fromAddress: params2.intermediaryAddress,
        toAddress: params2.respondingAddress,
        signature: context.signatures[2] // s6
      };
    },
    Opcode.IO_SEND,

    // M5
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox[0] = {
        ...message,
        seq: -1,
        fromAddress: params2.intermediaryAddress,
        toAddress: params2.initiatingAddress,
        signature: context.signatures[2], // s6
        signature2: context.signatures[1], // s2
        signature3: context.inbox[0].signature2 // s7
      };
    },

    Opcode.IO_SEND,

    Opcode.STATE_TRANSITION_COMMIT
  ],

  2: [
    proposeStateTransition3,

    // Sign two commitments
    Opcode.OP_SIGN,

    // M3
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox[0] = {
        ...message,
        seq: -1,
        fromAddress: params2.respondingAddress,
        toAddress: params2.intermediaryAddress,
        signature: context.signatures[0], // s4
        signature2: context.signatures[1] // s7
      };
    },

    // wait for M4
    Opcode.IO_SEND_AND_WAIT,

    Opcode.STATE_TRANSITION_COMMIT
  ]
};

function createTarget(
  signingKeys: string[],
  defaultTimeout: number,
  appInterface: AppInterface,
  initialState: SolidityABIEncoderV2Struct
) {
  return new AppInstance(
    AddressZero,
    signingKeys,
    defaultTimeout,
    appInterface,
    {
      assetType: AssetType.ETH,
      limit: Zero,
      token: AddressZero
    },
    true, // sets it to be a virtual app
    0, // app seq no: virtual app instances do not have appSeqNo
    0, // root nonce value: virtual app instances do not have rootNonceValue
    initialState,
    0, // app nonce
    defaultTimeout
  );
}

function addTarget(
  context: Context,
  initiatingAddress: string,
  respondingAddress: string,
  intermediaryAddress: string,
  targetAppInstance: AppInstance
) {
  const key = virtualChannelKey(
    [initiatingAddress, respondingAddress],
    intermediaryAddress
  );
  const sc = (
    context.stateChannelsMap.get(key) || StateChannel.createEmptyChannel()
  ).addVirtualAppInstance(targetAppInstance);
  context.stateChannelsMap.set(key, sc);
}

function proposeStateTransition1(message: ProtocolMessage, context: Context) {
  const {
    signingKeys,
    defaultTimeout,
    appInterface,
    initialState,
    initiatingBalanceDecrement,
    respondingBalanceDecrement,
    initiatingAddress,
    respondingAddress,
    intermediaryAddress
  } = message.params as InstallVirtualAppParams;

  const targetAppInstance = createTarget(
    signingKeys,
    defaultTimeout,
    appInterface,
    initialState
  );
  addTarget(
    context,
    initiatingAddress,
    respondingAddress,
    intermediaryAddress,
    targetAppInstance
  );

  const channelWithIntermediary = getChannelFromCounterparty(
    context.stateChannelsMap,
    initiatingAddress,
    intermediaryAddress
  );

  if (!channelWithIntermediary) {
    throw Error(
      "Cannot run InstallVirtualAppProtocol without existing channel with intermediary"
    );
  }

  const leftETHVirtualAppAgreementInstance = new ETHVirtualAppAgreementInstance(
    channelWithIntermediary.multisigAddress,
    {
      assetType: AssetType.ETH,
      limit: initiatingBalanceDecrement.add(respondingBalanceDecrement),
      token: AddressZero
    },
    channelWithIntermediary.numInstalledApps,
    channelWithIntermediary.rootNonceValue,
    100,
    initiatingBalanceDecrement.add(respondingBalanceDecrement).toNumber()
  );

  const newStateChannel = channelWithIntermediary.installETHVirtualAppAgreementInstance(
    leftETHVirtualAppAgreementInstance,
    targetAppInstance.identityHash,
    initiatingBalanceDecrement,
    respondingBalanceDecrement
  );
  context.stateChannelsMap.set(
    channelWithIntermediary.multisigAddress,
    newStateChannel
  );

  context.commitments[0] = constructETHVirtualAppAgreementCommitment(
    context.network,
    newStateChannel,
    targetAppInstance.identityHash,
    leftETHVirtualAppAgreementInstance
  );

  context.commitments[1] = new VirtualAppSetStateCommitment(
    context.network,
    targetAppInstance.identity,
    NONCE_EXPIRY,
    targetAppInstance.defaultTimeout,
    targetAppInstance.hashOfLatestState,
    0
  );
}

function proposeStateTransition2(message: ProtocolMessage, context: Context) {
  const {
    signingKeys,
    defaultTimeout,
    appInterface,
    initialState,
    initiatingBalanceDecrement,
    respondingBalanceDecrement,
    initiatingAddress,
    respondingAddress,
    intermediaryAddress
  } = message.params as InstallVirtualAppParams;

  const targetAppInstance = createTarget(
    signingKeys,
    defaultTimeout,
    appInterface,
    initialState
  );
  addTarget(
    context,
    initiatingAddress,
    respondingAddress,
    intermediaryAddress,
    targetAppInstance
  );

  const channelWithInitiating = getChannelFromCounterparty(
    context.stateChannelsMap,
    intermediaryAddress,
    initiatingAddress
  );

  if (!channelWithInitiating) {
    throw Error(
      "Cannot mediate InstallVirtualAppProtocol without mediation channel to initiating"
    );
  }

  const channelWithResponding = getChannelFromCounterparty(
    context.stateChannelsMap,
    intermediaryAddress,
    respondingAddress
  );

  if (!channelWithResponding) {
    throw Error(
      "Cannot mediate InstallVirtualAppProtocol without mediation channel to responding"
    );
  }

  const leftEthVirtualAppAgreementInstance = new ETHVirtualAppAgreementInstance(
    channelWithInitiating.multisigAddress,
    {
      assetType: AssetType.ETH,
      limit: initiatingBalanceDecrement.add(respondingBalanceDecrement),
      token: AddressZero
    },
    channelWithInitiating.numInstalledApps,
    channelWithInitiating.rootNonceValue,
    100,
    initiatingBalanceDecrement.add(respondingBalanceDecrement).toNumber()
  );

  const rightEthVirtualAppAgreementInstance = new ETHVirtualAppAgreementInstance(
    channelWithResponding.multisigAddress,
    {
      assetType: AssetType.ETH,
      limit: initiatingBalanceDecrement.add(respondingBalanceDecrement),
      token: AddressZero
    },
    channelWithResponding.numInstalledApps,
    channelWithResponding.rootNonceValue,
    100,
    initiatingBalanceDecrement.add(respondingBalanceDecrement).toNumber()
  );

  // S2
  context.commitments[0] = constructETHVirtualAppAgreementCommitment(
    context.network,
    channelWithInitiating,
    targetAppInstance.identityHash,
    leftEthVirtualAppAgreementInstance
  );

  // S3
  context.commitments[1] = constructETHVirtualAppAgreementCommitment(
    context.network,
    channelWithInitiating,
    targetAppInstance.identityHash,
    rightEthVirtualAppAgreementInstance
  );

  // S6
  const newStateChannel1 = channelWithInitiating.installETHVirtualAppAgreementInstance(
    leftEthVirtualAppAgreementInstance,
    targetAppInstance.identityHash,
    initiatingBalanceDecrement,
    respondingBalanceDecrement
  );
  context.stateChannelsMap.set(
    channelWithInitiating.multisigAddress,
    newStateChannel1
  );

  const newStateChannel2 = channelWithResponding.installETHVirtualAppAgreementInstance(
    leftEthVirtualAppAgreementInstance,
    targetAppInstance.identityHash,
    initiatingBalanceDecrement,
    respondingBalanceDecrement
  );
  context.stateChannelsMap.set(
    channelWithResponding.multisigAddress,
    newStateChannel2
  );

  context.commitments[2] = new VirtualAppSetStateCommitment(
    context.network,
    targetAppInstance.identity,
    NONCE_EXPIRY,
    targetAppInstance.defaultTimeout,
    HashZero,
    0
  );
}

function proposeStateTransition3(message: ProtocolMessage, context: Context) {
  const {
    signingKeys,
    defaultTimeout,
    appInterface,
    initialState,
    initiatingBalanceDecrement,
    respondingBalanceDecrement,
    initiatingAddress,
    respondingAddress,
    intermediaryAddress
  } = message.params as InstallVirtualAppParams;
  const targetAppInstance = createTarget(
    signingKeys,
    defaultTimeout,
    appInterface,
    initialState
  );
  addTarget(
    context,
    initiatingAddress,
    respondingAddress,
    intermediaryAddress,
    targetAppInstance
  );

  const channelWithIntermediary = getChannelFromCounterparty(
    context.stateChannelsMap,
    respondingAddress,
    intermediaryAddress
  );

  if (!channelWithIntermediary) {
    throw Error(
      "Cannot run InstallVirtualAppProtocol without existing channel with intermediary"
    );
  }

  const rightEthVirtualAppAgreementInstance = new ETHVirtualAppAgreementInstance(
    channelWithIntermediary.multisigAddress,
    {
      assetType: AssetType.ETH,
      limit: respondingBalanceDecrement,
      token: AddressZero
    },
    channelWithIntermediary.numInstalledApps,
    channelWithIntermediary.rootNonceValue,
    100,
    initiatingBalanceDecrement.add(respondingBalanceDecrement).toNumber()
  );

  const newStateChannel = channelWithIntermediary.installETHVirtualAppAgreementInstance(
    rightEthVirtualAppAgreementInstance,
    targetAppInstance.identityHash,
    initiatingBalanceDecrement,
    respondingBalanceDecrement
  );
  context.stateChannelsMap.set(
    channelWithIntermediary.multisigAddress,
    newStateChannel
  );

  // s4
  context.commitments[0] = constructETHVirtualAppAgreementCommitment(
    context.network,
    newStateChannel,
    targetAppInstance.identityHash,
    rightEthVirtualAppAgreementInstance
  );

  // s7
  context.commitments[1] = new VirtualAppSetStateCommitment(
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
    [],
    HashZero
  );
}
