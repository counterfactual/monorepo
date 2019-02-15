import { ETHVirtualAppAgreementCommitment } from "@counterfactual/machine/src/ethereum/eth-virtual-app-agreement-commitment";
import { VirtualAppSetStateCommitment } from "@counterfactual/machine/src/ethereum/virtual-app-set-state-commitment";
import { AppInterface, AssetType, NetworkContext } from "@counterfactual/types";
import { AddressZero, Zero } from "ethers/constants";
import { bigNumberify } from "ethers/utils";

import { OP_SIGN_0, Opcode } from "../enums";
import {
  AppInstance,
  ETHVirtualAppAgreementInstance,
  StateChannel
} from "../models";
import {
  Context,
  InstallVirtualAppParams,
  ProtocolExecutionFlow,
  ProtocolMessage,
  SolidityABIEncoderV2Struct
} from "../types";
import { virtualChannelKey } from "../virtual-app-key";
import { xkeyKthAddress, xkeysToSortedKthAddresses } from "../xkeys";

import { getChannelFromCounterparty } from "./utils/get-channel-from-counterparty";
import { validateSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 * https://specs.counterfactual.com/09-install-virtual-app-protocol
 *
 * Commitments Storage Layout:
 *
 * initiating
 *     0: AB ETH Virtual App Agreement
 *     1: ABC Virtual App Set State
 *
 * intermediary
 *     0: AB ETH Virtual App Agreement
 *     1: BC ETH Virtual App Agreement
 *     2: ABC Virtual App Set State
 *
 * responding
 *     0: BC ETH Virtual App Agreement
 *     1: ABC Virtual App Set State
 */
export const INSTALL_VIRTUAL_APP_PROTOCOL: ProtocolExecutionFlow = {
  0: [
    proposeStateTransition1,

    // Sign `context.commitment.getHash()` and `context.commitment2.getHash(false)`
    ...OP_SIGN_0,

    // M1
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox.push({
        ...message,
        signature: context.signatures[0], // s1
        signature2: context.signatures[1], // s5
        seq: 1,
        toAddress: params2.intermediaryXpub
      });
    },

    // wait for M5
    Opcode.IO_SEND_AND_WAIT,

    (message: ProtocolMessage, context: Context) => {
      const { intermediaryXpub } = message.params as InstallVirtualAppParams;

      validateSignature(
        xkeyKthAddress(intermediaryXpub, 0),
        context.commitments[1],
        context.inbox[0].signature,
        true
      );
    },

    (message: ProtocolMessage, context: Context) => {
      const { intermediaryXpub } = message.params as InstallVirtualAppParams;

      validateSignature(
        xkeyKthAddress(intermediaryXpub, 0),
        context.commitments[0],
        context.inbox[0].signature2
      );
    },

    (message: ProtocolMessage, context: Context) => {
      validateSignature(
        xkeyKthAddress(message.params.respondingXpub, 0),
        context.commitments[1],
        context.inbox[0].signature3
      );
    },

    Opcode.STATE_TRANSITION_COMMIT
  ],

  1: [
    proposeStateTransition2,

    (message: ProtocolMessage, context: Context) => {
      validateSignature(
        xkeyKthAddress(message.params.initiatingXpub, 0),
        context.commitments[0],
        message.signature
      );

      validateSignature(
        xkeyKthAddress(message.params.initiatingXpub, 0),
        context.commitments[2],
        message.signature2
      );
    },

    // Sign three commitments; pass `true` to hashToSign if asked
    (message: ProtocolMessage, context: Context) => {
      context.middlewareArgs = [0, true];
    },
    Opcode.OP_SIGN,
    (message: ProtocolMessage, context: Context) => {
      context.middlewareArgs = [];
    },

    // M2
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox[0] = {
        ...message,
        seq: 2,
        fromAddress: params2.intermediaryXpub,
        toAddress: params2.respondingXpub,
        signature: message.signature2, // s5
        signature2: context.signatures[1] // s3
      };
    },

    // wait for M3
    Opcode.IO_SEND_AND_WAIT,

    (message: ProtocolMessage, context: Context) => {
      validateSignature(
        xkeyKthAddress(message.params.respondingXpub, 0),
        context.commitments[1],
        context.inbox[0].signature
      );

      validateSignature(
        xkeyKthAddress(message.params.respondingXpub, 0),
        context.commitments[2],
        context.inbox[0].signature2
      );
    },

    // M4
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox[0] = {
        ...message,
        seq: -1,
        fromAddress: params2.intermediaryXpub,
        toAddress: params2.respondingXpub,
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
        fromAddress: params2.intermediaryXpub,
        toAddress: params2.initiatingXpub,
        signature: context.signatures[2], // s6
        signature2: context.signatures[0], // s2
        signature3: context.inbox[0].signature2 // s7
      };
    },

    Opcode.IO_SEND,

    Opcode.STATE_TRANSITION_COMMIT
  ],

  2: [
    proposeStateTransition3,

    (message: ProtocolMessage, context: Context) => {
      validateSignature(
        xkeyKthAddress(message.params.initiatingXpub, 0),
        context.commitments[1],
        message.signature
      );
    },

    (message: ProtocolMessage, context: Context) => {
      const { intermediaryXpub } = message.params as InstallVirtualAppParams;

      validateSignature(
        xkeyKthAddress(intermediaryXpub, 0),
        context.commitments[0],
        message.signature2
      );
    },

    // Sign two commitments
    ...OP_SIGN_0,

    // M3
    (message: ProtocolMessage, context: Context) => {
      const params2 = message.params as InstallVirtualAppParams;
      context.outbox[0] = {
        ...message,
        seq: -1,
        fromAddress: params2.respondingXpub,
        toAddress: params2.intermediaryXpub,
        signature: context.signatures[0], // s4
        signature2: context.signatures[1] // s7
      };
    },

    // wait for M4
    Opcode.IO_SEND_AND_WAIT,

    (message: ProtocolMessage, context: Context) => {
      const { intermediaryXpub } = message.params as InstallVirtualAppParams;

      validateSignature(
        xkeyKthAddress(intermediaryXpub, 0),
        context.commitments[1],
        context.inbox[0].signature,
        true
      );
    },

    Opcode.STATE_TRANSITION_COMMIT
  ]
};

function createAndAddTarget(
  defaultTimeout: number,
  appInterface: AppInterface,
  initialState: SolidityABIEncoderV2Struct,
  context: Context,
  initiatingXpub: string,
  respondingXpub: string,
  intermediaryXpub: string
): AppInstance {
  const key = virtualChannelKey(
    [initiatingXpub, respondingXpub],
    intermediaryXpub
  );

  const sc =
    context.stateChannelsMap.get(key) ||
    StateChannel.createEmptyChannel(key, [initiatingXpub, respondingXpub]);

  const appSeqNo = sc.numInstalledApps;

  // https://github.com/counterfactual/specs/blob/master/09-install-virtual-app-protocol.md#derived-fields
  const signingKeys = [xkeyKthAddress(intermediaryXpub, appSeqNo)].concat(
    xkeysToSortedKthAddresses([initiatingXpub, respondingXpub], appSeqNo)
  );

  const target = new AppInstance(
    AddressZero,
    signingKeys,
    defaultTimeout,
    appInterface,
    {
      assetType: AssetType.ETH,
      limit: Zero, // limit field is ignored, since limits are enforced by virtual app agreement
      token: AddressZero
    },
    true, // sets it to be a virtual app
    sc.numInstalledApps, // app seq no
    0, // root nonce value: virtual app instances do not have rootNonceValue
    initialState,
    0, // app nonce
    defaultTimeout
  );

  const newSc = sc.addVirtualAppInstance(target);

  context.stateChannelsMap.set(key, newSc);

  // Needed for STATE_TRANSITION_COMMIT presently
  context.appIdentityHash = target.identityHash;

  return target;
}

function proposeStateTransition1(message: ProtocolMessage, context: Context) {
  const {
    defaultTimeout,
    appInterface,
    initialState,
    initiatingBalanceDecrement,
    respondingBalanceDecrement,
    initiatingXpub,
    intermediaryXpub,
    respondingXpub
  } = message.params as InstallVirtualAppParams;

  const targetAppInstance = createAndAddTarget(
    defaultTimeout,
    appInterface,
    initialState,
    context,
    initiatingXpub,
    respondingXpub,
    intermediaryXpub
  );

  const channelWithIntermediary = getChannelFromCounterparty(
    context.stateChannelsMap,
    initiatingXpub,
    intermediaryXpub
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
      limit: bigNumberify(initiatingBalanceDecrement).add(
        respondingBalanceDecrement
      ),
      token: AddressZero
    },
    channelWithIntermediary.numInstalledApps,
    channelWithIntermediary.rootNonceValue,
    100,
    bigNumberify(initiatingBalanceDecrement)
      .add(respondingBalanceDecrement)
      .toNumber(),
    targetAppInstance.identityHash,
    xkeyKthAddress(initiatingXpub, 0),
    xkeyKthAddress(intermediaryXpub, 0)
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
    targetAppInstance.defaultTimeout,
    targetAppInstance.hashOfLatestState,
    0
  );
}

function proposeStateTransition2(message: ProtocolMessage, context: Context) {
  const {
    intermediaryXpub,
    initiatingXpub,
    respondingXpub,
    defaultTimeout,
    appInterface,
    initialState,
    initiatingBalanceDecrement,
    respondingBalanceDecrement
  } = message.params as InstallVirtualAppParams;

  const targetAppInstance = createAndAddTarget(
    defaultTimeout,
    appInterface,
    initialState,
    context,
    initiatingXpub,
    respondingXpub,
    intermediaryXpub
  );

  const channelWithInitiating = getChannelFromCounterparty(
    context.stateChannelsMap,
    intermediaryXpub,
    initiatingXpub
  );

  if (!channelWithInitiating) {
    throw Error(
      "Cannot mediate InstallVirtualAppProtocol without mediation channel to initiating"
    );
  }

  const channelWithResponding = getChannelFromCounterparty(
    context.stateChannelsMap,
    intermediaryXpub,
    respondingXpub
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
      limit: bigNumberify(initiatingBalanceDecrement).add(
        respondingBalanceDecrement
      ),
      token: AddressZero
    },
    channelWithInitiating.numInstalledApps,
    channelWithInitiating.rootNonceValue,
    100,
    bigNumberify(initiatingBalanceDecrement)
      .add(respondingBalanceDecrement)
      .toNumber(),
    targetAppInstance.identityHash,
    xkeyKthAddress(initiatingXpub, 0),
    xkeyKthAddress(intermediaryXpub, 0)
  );

  const rightEthVirtualAppAgreementInstance = new ETHVirtualAppAgreementInstance(
    channelWithResponding.multisigAddress,
    {
      assetType: AssetType.ETH,
      limit: bigNumberify(initiatingBalanceDecrement).add(
        respondingBalanceDecrement
      ),
      token: AddressZero
    },
    channelWithResponding.numInstalledApps,
    channelWithResponding.rootNonceValue,
    100,
    bigNumberify(initiatingBalanceDecrement)
      .add(respondingBalanceDecrement)
      .toNumber(),
    targetAppInstance.identityHash,
    xkeyKthAddress(intermediaryXpub, 0),
    xkeyKthAddress(respondingXpub, 0)
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
    channelWithResponding,
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
    targetAppInstance.defaultTimeout,
    targetAppInstance.hashOfLatestState,
    0
  );
}

function proposeStateTransition3(message: ProtocolMessage, context: Context) {
  const {
    defaultTimeout,
    appInterface,
    initialState,
    initiatingBalanceDecrement,
    respondingBalanceDecrement,
    initiatingXpub,
    respondingXpub,
    intermediaryXpub
  } = message.params as InstallVirtualAppParams;

  const targetAppInstance = createAndAddTarget(
    defaultTimeout,
    appInterface,
    initialState,
    context,
    initiatingXpub,
    respondingXpub,
    intermediaryXpub
  );

  const channelWithIntermediary = getChannelFromCounterparty(
    context.stateChannelsMap,
    respondingXpub,
    intermediaryXpub
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
      limit: bigNumberify(initiatingBalanceDecrement).add(
        respondingBalanceDecrement
      ),
      token: AddressZero
    },
    channelWithIntermediary.numInstalledApps,
    channelWithIntermediary.rootNonceValue,
    100,
    bigNumberify(initiatingBalanceDecrement)
      .add(respondingBalanceDecrement)
      .toNumber(),
    targetAppInstance.identityHash,
    xkeyKthAddress(intermediaryXpub, 0),
    xkeyKthAddress(respondingXpub, 0)
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
    bigNumberify(ethVirtualAppAgreementInstance.expiry),
    bigNumberify(ethVirtualAppAgreementInstance.capitalProvided),
    [
      ethVirtualAppAgreementInstance.beneficiary1,
      ethVirtualAppAgreementInstance.beneficiary2
    ],
    ethVirtualAppAgreementInstance.uninstallKey
  );
}
