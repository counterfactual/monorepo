import {
  AppInterface,
  NetworkContext,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { AddressZero } from "ethers/constants";
import { bigNumberify, BigNumberish } from "ethers/utils";

import { TwoPartyVirtualEthAsLumpCommitment } from "../ethereum/two-party-virtual-eth-as-lump-commitment";
import { VirtualAppSetStateCommitment } from "../ethereum/virtual-app-set-state-commitment";
import { Opcode, Protocol } from "../machine/enums";
import {
  InstallVirtualAppParams,
  ProtocolMessage,
  ProtocolParameters,
  VirtualChannelIntermediaryProtocolContext,
  VirtualChannelProtocolContext,
  VirtualChannelProtocolExecutionFlow
} from "../machine/types";
import { virtualChannelKey } from "../machine/virtual-app-key";
import { xkeyKthAddress, xkeysToSortedKthAddresses } from "../machine/xkeys";
import {
  AppInstance,
  StateChannel,
  TwoPartyVirtualEthAsLumpInstance
} from "../models";

import { validateSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 * https://specs.counterfactual.com/09-install-virtual-app-protocol
 *
 * Commitments Storage Layout:
 */
export const INSTALL_VIRTUAL_APP_PROTOCOL: VirtualChannelProtocolExecutionFlow = {
  0: async function*(context: VirtualChannelProtocolContext) {
    const { intermediaryXpub, respondingXpub } = context.message
      .params as InstallVirtualAppParams;
    const intermediaryAddress = xkeyKthAddress(intermediaryXpub, 0);
    const respondingAddress = xkeyKthAddress(respondingXpub, 0);

    const [
      leftCommitment,
      virtualAppSetStateCommitment
    ] = proposeStateTransition1(context.message.params, context);

    const s1 = yield [Opcode.OP_SIGN, leftCommitment];
    const s5 = yield [Opcode.OP_SIGN, virtualAppSetStateCommitment];

    // send M1, wait for M5
    const m5 = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        protocol: Protocol.InstallVirtualApp,
        protocolExecutionID: context.message.protocolExecutionID,
        toXpub: intermediaryXpub,
        seq: 1,
        params: context.message.params,
        signature: s1,
        signature2: s5
      } as ProtocolMessage
    ];

    const { signature: s6, signature2: s2, signature3: s7 } = m5;

    validateSignature(
      intermediaryAddress,
      virtualAppSetStateCommitment,
      s6,
      true
    );

    validateSignature(intermediaryAddress, leftCommitment, s2);

    validateSignature(respondingAddress, virtualAppSetStateCommitment, s7);
  },

  1: async function*(context: VirtualChannelIntermediaryProtocolContext) {
    const { initiatingXpub, respondingXpub } = context.message
      .params as InstallVirtualAppParams;

    const initiatingAddress = xkeyKthAddress(initiatingXpub, 0);
    const respondingAddress = xkeyKthAddress(respondingXpub, 0);

    const [
      newChannelWithInitiating,
      newChannelWithResponding,
      leftCommitment,
      rightCommitment,
      virtualAppSetStateCommitment
    ] = proposeStateTransition2(context.message.params, context);

    const { signature: s1, signature2: s5 } = context.message;

    validateSignature(initiatingAddress, leftCommitment, s1);
    validateSignature(initiatingAddress, virtualAppSetStateCommitment, s5);

    const s2 = yield [Opcode.OP_SIGN, leftCommitment];
    const s3 = yield [Opcode.OP_SIGN, rightCommitment];
    const s6 = yield [
      Opcode.OP_SIGN_AS_INTERMEDIARY,
      virtualAppSetStateCommitment
    ];

    const m3 = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        protocol: Protocol.InstallVirtualApp,
        protocolExecutionID: context.message.protocolExecutionID,
        params: context.message.params,
        seq: 2,
        toXpub: respondingXpub,
        signature: s5,
        signature2: s3
      } as ProtocolMessage
    ];

    const { signature: s4, signature2: s7 } = m3;

    validateSignature(respondingAddress, rightCommitment, s4);

    validateSignature(respondingAddress, virtualAppSetStateCommitment, s7);

    // m4
    yield [
      Opcode.IO_SEND,
      {
        protocol: Protocol.InstallVirtualApp,
        protocolExecutionID: context.message.protocolExecutionID,
        seq: -1,
        toXpub: respondingXpub,
        signature: s6
      }
    ];

    // m5
    yield [
      Opcode.IO_SEND,
      {
        protocol: Protocol.InstallVirtualApp,
        protocolExecutionID: context.message.protocolExecutionID,
        seq: -1,
        toXpub: initiatingXpub,
        signature: s6,
        signature2: s2,
        signature3: s7
      }
    ];

    context.stateChannelWithInitiating = newChannelWithInitiating;
    context.stateChannelWithResponding = newChannelWithResponding;
  },

  2: async function*(context: VirtualChannelProtocolContext) {
    const [
      rightCommitment,
      virtualAppSetStateCommitment
    ] = proposeStateTransition3(context.message.params, context);

    const { initiatingXpub, intermediaryXpub } = context.message
      .params as InstallVirtualAppParams;

    const initiatingAddress = xkeyKthAddress(initiatingXpub, 0);
    const intermediaryAddress = xkeyKthAddress(intermediaryXpub, 0);

    // m2
    const { signature: s5, signature2: s3 } = context.message;

    validateSignature(initiatingAddress, virtualAppSetStateCommitment, s5);
    validateSignature(intermediaryAddress, rightCommitment, s3);

    const s4 = yield [Opcode.OP_SIGN, rightCommitment];
    const s7 = yield [Opcode.OP_SIGN, virtualAppSetStateCommitment];

    // send m3
    const m4 = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        protocol: Protocol.InstallVirtualApp,
        protocolExecutionID: context.message.protocolExecutionID,
        seq: -1,
        toXpub: intermediaryXpub,
        signature: s4,
        signature2: s7
      }
    ];
    const { signature: s6 } = m4;

    validateSignature(
      intermediaryAddress,
      virtualAppSetStateCommitment,
      s6,
      true
    );
  }
};

function createAndAddTarget(
  defaultTimeout: number,
  appInterface: AppInterface,
  initialState: SolidityABIEncoderV2Type,
  initiatingBalanceDecrement: BigNumberish, // FIXME: serialize
  respondingBalanceDecrement: BigNumberish,
  context:
    | VirtualChannelProtocolContext
    | VirtualChannelIntermediaryProtocolContext,
  initiatingXpub: string,
  respondingXpub: string,
  intermediaryXpub: string
): AppInstance {
  const key = virtualChannelKey(
    [initiatingXpub, respondingXpub],
    intermediaryXpub
  );

  const sc =
    context.stateChannelWithCounterparty ||
    StateChannel.createEmptyChannel(key, [initiatingXpub, respondingXpub]);

  const appSeqNo = sc.numInstalledApps;

  // https://github.com/counterfactual/specs/blob/master/09-install-virtual-app-protocol.md#derived-fields
  const signingKeys = [xkeyKthAddress(intermediaryXpub, appSeqNo)].concat(
    xkeysToSortedKthAddresses([initiatingXpub, respondingXpub], appSeqNo)
  );

  const initiatingAddress = xkeyKthAddress(initiatingXpub, 0);
  const respondingAddress = xkeyKthAddress(respondingXpub, 0);

  const target = new AppInstance(
    AddressZero,
    signingKeys,
    defaultTimeout,
    appInterface,
    true, // sets it to be a virtual app
    sc.numInstalledApps, // app seq no
    0, // root nonce value: virtual app instances do not have rootNonceValue
    initialState,
    0, // app nonce
    defaultTimeout,
    // FIXME: _Every_ virtual app is hard-coded to the two party fixed outcome type
    {
      playerAddrs: [initiatingAddress, respondingAddress],
      amount: bigNumberify(initiatingBalanceDecrement).add(
        respondingBalanceDecrement
      )
    },
    undefined
  );

  context.stateChannelWithCounterparty = sc.addVirtualAppInstance(target);

  return target;
}

function proposeStateTransition1(
  params: ProtocolParameters,
  context: VirtualChannelProtocolContext
): [TwoPartyVirtualEthAsLumpCommitment, VirtualAppSetStateCommitment] {
  const {
    defaultTimeout,
    appInterface,
    initialState,
    initiatingBalanceDecrement,
    respondingBalanceDecrement,
    initiatingXpub,
    intermediaryXpub,
    respondingXpub
  } = params as InstallVirtualAppParams;

  const targetAppInstance = createAndAddTarget(
    defaultTimeout,
    appInterface,
    initialState,
    initiatingBalanceDecrement,
    respondingBalanceDecrement,
    context,
    initiatingXpub,
    respondingXpub,
    intermediaryXpub
  );

  if (!context.stateChannelWithIntermediary) {
    throw Error(
      "Initiating party does not have a channel with the intermediary"
    );
  }

  const initiatingAddress = xkeyKthAddress(initiatingXpub, 0);
  const intermediaryAddress = xkeyKthAddress(intermediaryXpub, 0);

  const leftETHVirtualAppAgreementInstance = new TwoPartyVirtualEthAsLumpInstance(
    context.stateChannelWithIntermediary.multisigAddress,
    context.stateChannelWithIntermediary.numInstalledApps,
    context.stateChannelWithIntermediary.rootNonceValue,
    100,
    bigNumberify(initiatingBalanceDecrement).add(respondingBalanceDecrement),
    targetAppInstance.identityHash,
    initiatingAddress,
    intermediaryAddress
  );

  context.stateChannelWithIntermediary = context.stateChannelWithIntermediary.installTwoPartyVirtualEthAsLumpInstances(
    leftETHVirtualAppAgreementInstance,
    targetAppInstance.identityHash,
    {
      [initiatingAddress]: initiatingBalanceDecrement,
      [intermediaryAddress]: respondingBalanceDecrement
    }
  );

  const leftCommitment = constructTwoPartyVirtualEthAsLumpCommitment(
    context.network,
    context.stateChannelWithIntermediary,
    targetAppInstance.identityHash,
    leftETHVirtualAppAgreementInstance
  );

  const virtualAppSetStateCommitment = new VirtualAppSetStateCommitment(
    context.network,
    targetAppInstance.identity,
    targetAppInstance.defaultTimeout,
    targetAppInstance.hashOfLatestState,
    0
  );

  return [leftCommitment, virtualAppSetStateCommitment];
}

function proposeStateTransition2(
  params: ProtocolParameters,
  context: VirtualChannelIntermediaryProtocolContext
): [
  StateChannel,
  StateChannel,
  TwoPartyVirtualEthAsLumpCommitment,
  TwoPartyVirtualEthAsLumpCommitment,
  VirtualAppSetStateCommitment
] {
  const {
    intermediaryXpub,
    initiatingXpub,
    respondingXpub,
    defaultTimeout,
    appInterface,
    initialState,
    initiatingBalanceDecrement,
    respondingBalanceDecrement
  } = params as InstallVirtualAppParams;

  const targetAppInstance = createAndAddTarget(
    defaultTimeout,
    appInterface,
    initialState,
    initiatingBalanceDecrement,
    respondingBalanceDecrement,
    context,
    initiatingXpub,
    respondingXpub,
    intermediaryXpub
  );

  const channelWithInitiating = context.stateChannelWithInitiating;

  if (!channelWithInitiating) {
    throw Error(
      "Cannot mediate InstallVirtualAppProtocol without mediation channel to initiating"
    );
  }

  const channelWithResponding = context.stateChannelWithResponding;

  if (!channelWithResponding) {
    throw Error(
      "Cannot mediate InstallVirtualAppProtocol without mediation channel to responding"
    );
  }

  const leftEthVirtualAppAgreementInstance = new TwoPartyVirtualEthAsLumpInstance(
    channelWithInitiating.multisigAddress,
    channelWithInitiating.numInstalledApps,
    channelWithInitiating.rootNonceValue,
    100,
    bigNumberify(initiatingBalanceDecrement).add(respondingBalanceDecrement),
    targetAppInstance.identityHash,
    xkeyKthAddress(initiatingXpub, 0),
    xkeyKthAddress(intermediaryXpub, 0)
  );

  const rightEthVirtualAppAgreementInstance = new TwoPartyVirtualEthAsLumpInstance(
    channelWithResponding.multisigAddress,
    channelWithResponding.numInstalledApps,
    channelWithResponding.rootNonceValue,
    100,
    bigNumberify(initiatingBalanceDecrement).add(respondingBalanceDecrement),
    targetAppInstance.identityHash,
    xkeyKthAddress(intermediaryXpub, 0),
    xkeyKthAddress(respondingXpub, 0)
  );

  const initiatingAddress = xkeyKthAddress(initiatingXpub, 0);
  const intermediaryAddress = xkeyKthAddress(intermediaryXpub, 0);
  const respondingAddress = xkeyKthAddress(respondingXpub, 0);

  const newChannelWithInitiating = context.stateChannelWithInitiating.installTwoPartyVirtualEthAsLumpInstances(
    leftEthVirtualAppAgreementInstance,
    targetAppInstance.identityHash,
    {
      [initiatingAddress]: initiatingBalanceDecrement,
      [intermediaryAddress]: respondingBalanceDecrement
    }
  );

  const newChannelWithResponding = channelWithResponding.installTwoPartyVirtualEthAsLumpInstances(
    rightEthVirtualAppAgreementInstance,
    targetAppInstance.identityHash,
    {
      [intermediaryAddress]: initiatingBalanceDecrement,
      [respondingAddress]: respondingBalanceDecrement
    }
  );

  const leftCommitment = constructTwoPartyVirtualEthAsLumpCommitment(
    context.network,
    newChannelWithInitiating,
    targetAppInstance.identityHash,
    leftEthVirtualAppAgreementInstance
  );

  const rightCommitment = constructTwoPartyVirtualEthAsLumpCommitment(
    context.network,
    newChannelWithResponding,
    targetAppInstance.identityHash,
    rightEthVirtualAppAgreementInstance
  );

  const virtualAppSetStateCommitment = new VirtualAppSetStateCommitment(
    context.network,
    targetAppInstance.identity,
    targetAppInstance.defaultTimeout,
    targetAppInstance.hashOfLatestState,
    0
  );

  return [
    newChannelWithInitiating,
    newChannelWithResponding,
    leftCommitment,
    rightCommitment,
    virtualAppSetStateCommitment
  ];
}

function proposeStateTransition3(
  params: ProtocolParameters,
  context: VirtualChannelProtocolContext
): [TwoPartyVirtualEthAsLumpCommitment, VirtualAppSetStateCommitment] {
  const {
    defaultTimeout,
    appInterface,
    initialState,
    initiatingBalanceDecrement,
    respondingBalanceDecrement,
    initiatingXpub,
    respondingXpub,
    intermediaryXpub
  } = params as InstallVirtualAppParams;

  const targetAppInstance = createAndAddTarget(
    defaultTimeout,
    appInterface,
    initialState,
    initiatingBalanceDecrement,
    respondingBalanceDecrement,
    context,
    initiatingXpub,
    respondingXpub,
    intermediaryXpub
  );

  const channelWithIntermediary = context.stateChannelWithIntermediary;

  if (!channelWithIntermediary) {
    throw Error(
      "Responding party does not have a channel with the intermediary"
    );
  }

  const rightEthVirtualAppAgreementInstance = new TwoPartyVirtualEthAsLumpInstance(
    channelWithIntermediary.multisigAddress,
    channelWithIntermediary.numInstalledApps,
    channelWithIntermediary.rootNonceValue,
    100,
    bigNumberify(initiatingBalanceDecrement).add(respondingBalanceDecrement),
    targetAppInstance.identityHash,
    xkeyKthAddress(intermediaryXpub, 0),
    xkeyKthAddress(respondingXpub, 0)
  );

  const intermediaryAddress = xkeyKthAddress(intermediaryXpub, 0);
  const respondingAddress = xkeyKthAddress(respondingXpub, 0);

  const newStateChannel = channelWithIntermediary.installTwoPartyVirtualEthAsLumpInstances(
    rightEthVirtualAppAgreementInstance,
    targetAppInstance.identityHash,
    {
      [intermediaryAddress]: initiatingBalanceDecrement,
      [respondingAddress]: respondingBalanceDecrement
    }
  );

  context.stateChannelWithIntermediary = newStateChannel;

  const rightCommitment = constructTwoPartyVirtualEthAsLumpCommitment(
    context.network,
    newStateChannel,
    targetAppInstance.identityHash,
    rightEthVirtualAppAgreementInstance
  );

  const virtualAppSetStateCommitment = new VirtualAppSetStateCommitment(
    context.network,
    targetAppInstance.identity,
    targetAppInstance.defaultTimeout,
    targetAppInstance.hashOfLatestState,
    0
  );

  return [rightCommitment, virtualAppSetStateCommitment];
}

function constructTwoPartyVirtualEthAsLumpCommitment(
  network: NetworkContext,
  stateChannel: StateChannel,
  targetHash: string,
  ethVirtualAppAgreementInstance: TwoPartyVirtualEthAsLumpInstance
) {
  const freeBalance = stateChannel.freeBalance;

  return new TwoPartyVirtualEthAsLumpCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    targetHash,
    freeBalance.identity,
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
