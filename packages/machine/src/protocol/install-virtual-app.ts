import { ETHVirtualAppAgreementCommitment } from "@counterfactual/machine/src/ethereum/eth-virtual-app-agreement-commitment";
import { VirtualAppSetStateCommitment } from "@counterfactual/machine/src/ethereum/virtual-app-set-state-commitment";
import {
  AppInterface,
  AssetType,
  NetworkContext,
  SolidityABIEncoderV2Struct
} from "@counterfactual/types";
import { AddressZero } from "ethers/constants";
import { BigNumber } from "ethers/utils";

import { ProtocolExecutionFlow } from "..";
import { Opcode } from "../enums";
import {
  AppInstance,
  ETHVirtualAppAgreementInstance,
  StateChannel
} from "../models";
import { Context, InstallVirtualAppParams, ProtocolMessage } from "../types";

// hardcoded assumption: all installed virtual apps can go through this many update operations
const NONCE_EXPIRY = 65536;

// TODO: Add signature validation

/**
 * @description This exchange is described at the following URL:
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
    Opcode.IO_SEND_AND_WAIT
  ],

  1: [
    proposeStateTransition2,

    // Sign three commitments; pass `true` to hashToSign if asked
    Opcode.OP_SIGN_AS_INTERMEDIARY,

    // M2
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox[0] = message;
      context.outbox[0].seq = 2;
      context.outbox[0].fromAddress = params2.intermediaryAddress;
      context.outbox[0].toAddress = params2.respondingAddress;
      context.outbox[0].signature = message.signature2; // s5
      context.outbox[0].signature2 = context.signatures[0]; // s3
    },

    // wait for M3
    Opcode.IO_SEND_AND_WAIT,

    // M4
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox[0] = message;
      context.outbox[0].seq = 4;
      context.outbox[0].fromAddress = params2.intermediaryAddress;
      context.outbox[0].toAddress = params2.respondingAddress;
      context.outbox[0].signature = context.signatures[2]; // s6
    },
    Opcode.IO_SEND,

    // M5
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox[0] = message;
      context.outbox[0].seq = 5;
      context.outbox[0].fromAddress = params2.intermediaryAddress;
      context.outbox[0].toAddress = params2.initiatingAddress;
      context.outbox[0].signature = context.signatures[2]; // s6
      context.outbox[0].signature2 = context.signatures[1]; // s2
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
      context.outbox[0].signature = context.signatures[0]; // s4
      context.outbox[0].signature2 = context.signatures[1]; // s7
    },

    // wait for M4
    Opcode.IO_SEND_AND_WAIT
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
      assetType: 0,
      limit: new BigNumber(0),
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

function proposeStateTransition1(message: ProtocolMessage, context: Context) {
  const {
    signingKeys,
    defaultTimeout,
    appInterface,
    initialState,
    initiatingBalanceDecrement,
    respondingBalanceDecrement,
    multisig1Address
  } = message.params as InstallVirtualAppParams;

  const targetAppInstance = createTarget(
    signingKeys,
    defaultTimeout,
    appInterface,
    initialState
  );
  context.targetVirtualAppInstance = targetAppInstance;

  const leftETHVirtualAppAgreementInstance = new ETHVirtualAppAgreementInstance(
    context.stateChannelsMap.get(multisig1Address)!.multisigAddress,
    {
      assetType: 0,
      limit: initiatingBalanceDecrement.add(respondingBalanceDecrement),
      token: ""
    },
    context.stateChannelsMap.get(multisig1Address)!.numInstalledApps + 1,
    context.stateChannelsMap.get(multisig1Address)!.rootNonceValue,
    100,
    initiatingBalanceDecrement.add(respondingBalanceDecrement).toNumber()
  );

  const newStateChannel = context.stateChannelsMap
    .get(multisig1Address)!
    .installETHVirtualAppAgreementInstance(
      leftETHVirtualAppAgreementInstance,
      initiatingBalanceDecrement,
      respondingBalanceDecrement
    );
  context.stateChannelsMap.set(multisig1Address, newStateChannel);

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
    multisig1Address,
    multisig2Address,
    signingKeys,
    defaultTimeout,
    appInterface,
    initialState,
    initiatingBalanceDecrement,
    respondingBalanceDecrement
  } = message.params as InstallVirtualAppParams;

  const targetAppInstance = createTarget(
    signingKeys,
    defaultTimeout,
    appInterface,
    initialState
  );

  const leftEthVirtualAppAgreementInstance = new ETHVirtualAppAgreementInstance(
    context.stateChannelsMap.get(multisig1Address)!.multisigAddress,
    {
      assetType: 0,
      limit: initiatingBalanceDecrement.add(respondingBalanceDecrement),
      token: ""
    },
    context.stateChannelsMap.get(multisig1Address)!.numInstalledApps + 1,
    context.stateChannelsMap.get(multisig1Address)!.rootNonceValue,
    100,
    initiatingBalanceDecrement.add(respondingBalanceDecrement).toNumber()
  );

  const rightEthVirtualAppAgreementInstance = new ETHVirtualAppAgreementInstance(
    context.stateChannelsMap.get(multisig2Address)!.multisigAddress,
    {
      assetType: 0,
      limit: initiatingBalanceDecrement.add(respondingBalanceDecrement),
      token: ""
    },
    context.stateChannelsMap.get(multisig2Address)!.numInstalledApps + 1,
    context.stateChannelsMap.get(multisig2Address)!.rootNonceValue,
    100,
    initiatingBalanceDecrement.add(respondingBalanceDecrement).toNumber()
  );

  // S2
  context.commitments[0] = constructETHVirtualAppAgreementCommitment(
    context.network,
    context.stateChannelsMap.get(multisig1Address)!,
    targetAppInstance.identityHash,
    leftEthVirtualAppAgreementInstance
  );

  // S3
  context.commitments[1] = constructETHVirtualAppAgreementCommitment(
    context.network,
    context.stateChannelsMap.get(multisig1Address)!,
    targetAppInstance.identityHash,
    rightEthVirtualAppAgreementInstance
  );

  // S6
  const newStateChannel1 = context.stateChannelsMap
    .get(multisig1Address)!
    .installETHVirtualAppAgreementInstance(
      leftEthVirtualAppAgreementInstance,
      initiatingBalanceDecrement,
      respondingBalanceDecrement
    );
  context.stateChannelsMap.set(multisig1Address, newStateChannel1);

  const newStateChannel2 = context.stateChannelsMap
    .get(multisig2Address)!
    .installETHVirtualAppAgreementInstance(
      leftEthVirtualAppAgreementInstance,
      initiatingBalanceDecrement,
      respondingBalanceDecrement
    );
  context.stateChannelsMap.set(multisig2Address, newStateChannel2);

  context.commitments[2] = new VirtualAppSetStateCommitment(
    context.network,
    targetAppInstance.identity,
    NONCE_EXPIRY,
    targetAppInstance.defaultTimeout,
    "",
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
    multisig2Address
  } = message.params as InstallVirtualAppParams;
  const targetAppInstance = createTarget(
    signingKeys,
    defaultTimeout,
    appInterface,
    initialState
  );

  const rightEthVirtualAppAgreementInstance = new ETHVirtualAppAgreementInstance(
    context.stateChannelsMap.get(multisig2Address)!.multisigAddress,
    {
      assetType: 0,
      limit: respondingBalanceDecrement,
      token: AddressZero
    },
    context.stateChannelsMap.get(multisig2Address)!.numInstalledApps + 1,
    context.stateChannelsMap.get(multisig2Address)!.rootNonceValue,
    100,
    initiatingBalanceDecrement.add(respondingBalanceDecrement).toNumber()
  );

  const newStateChannel = context.stateChannelsMap
    .get(multisig2Address)!
    .installETHVirtualAppAgreementInstance(
      rightEthVirtualAppAgreementInstance,
      initiatingBalanceDecrement,
      respondingBalanceDecrement
    );
  context.stateChannelsMap.set(multisig2Address, newStateChannel);

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
    []
  );
}
