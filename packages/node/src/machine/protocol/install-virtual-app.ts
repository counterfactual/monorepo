import {
  AppInterface,
  AssetType,
  NetworkContext,
  SolidityABIEncoderV2Struct
} from "@counterfactual/types";
import { AddressZero } from "ethers/constants";
import { bigNumberify, BigNumberish } from "ethers/utils";

import { Opcode } from "../enums";
import { ETHVirtualAppAgreementCommitment } from "../ethereum/eth-virtual-app-agreement-commitment";
import { VirtualAppSetStateCommitment } from "../ethereum/virtual-app-set-state-commitment";
import {
  AppInstance,
  ETHVirtualAppAgreementInstance,
  StateChannel
} from "../models";
import {
  Context,
  InstallVirtualAppParams,
  ProtocolExecutionFlow,
  ProtocolParameters
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
 */
export const INSTALL_VIRTUAL_APP_PROTOCOL: ProtocolExecutionFlow = {
  0: async function*(context: Context) {
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
        ...context.message,
        signature: s1,
        signature2: s5,
        toXpub: intermediaryXpub,
        seq: 1
      }
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

  1: async function*(context: Context) {
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
        ...context.message,
        seq: 2,
        toXpub: respondingXpub,
        signature: s5,
        signature2: s3
      }
    ];

    const { signature: s4, signature2: s7 } = m3;

    validateSignature(respondingAddress, rightCommitment, s4);

    validateSignature(respondingAddress, virtualAppSetStateCommitment, s7);

    // m4
    yield [
      Opcode.IO_SEND,
      {
        ...context.message,
        seq: -1,
        toXpub: respondingXpub,
        signature: s6
      }
    ];

    // m5
    yield [
      Opcode.IO_SEND,
      {
        ...context.message,
        seq: -1,
        toXpub: initiatingXpub,
        signature: s6,
        signature2: s2,
        signature3: s7
      }
    ];

    context.stateChannelsMap.set(
      newChannelWithInitiating.multisigAddress,
      newChannelWithInitiating
    );
    context.stateChannelsMap.set(
      newChannelWithResponding.multisigAddress,
      newChannelWithResponding
    );
  },

  2: async function*(context: Context) {
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
        ...context.message,
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
  initialState: SolidityABIEncoderV2Struct,
  initiatingBalanceDecrement: BigNumberish, // FIXME: serialize
  respondingBalanceDecrement: BigNumberish,
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
      limit: bigNumberify(initiatingBalanceDecrement).add(
        bigNumberify(respondingBalanceDecrement)
      ),
      token: AddressZero // TODO: support tokens
    },
    true, // sets it to be a virtual app
    sc.numInstalledApps, // app seq no
    0, // root nonce value: virtual app instances do not have rootNonceValue
    initialState,
    0, // app nonce
    defaultTimeout
  );

  const newStateChannel = sc.addVirtualAppInstance(target);
  context.stateChannelsMap.set(
    newStateChannel.multisigAddress,
    newStateChannel
  );

  return target;
}

function proposeStateTransition1(
  params: ProtocolParameters,
  context: Context
): [ETHVirtualAppAgreementCommitment, VirtualAppSetStateCommitment] {
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
    bigNumberify(initiatingBalanceDecrement).add(respondingBalanceDecrement),
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
    newStateChannel.multisigAddress,
    newStateChannel
  );

  const leftCommitment = constructETHVirtualAppAgreementCommitment(
    context.network,
    newStateChannel,
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
  context: Context
): [
  StateChannel,
  StateChannel,
  ETHVirtualAppAgreementCommitment,
  ETHVirtualAppAgreementCommitment,
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
    bigNumberify(initiatingBalanceDecrement).add(respondingBalanceDecrement),
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
    bigNumberify(initiatingBalanceDecrement).add(respondingBalanceDecrement),
    targetAppInstance.identityHash,
    xkeyKthAddress(intermediaryXpub, 0),
    xkeyKthAddress(respondingXpub, 0)
  );

  const newChannelWithInitiating = channelWithInitiating.installETHVirtualAppAgreementInstance(
    leftEthVirtualAppAgreementInstance,
    targetAppInstance.identityHash,
    initiatingBalanceDecrement,
    respondingBalanceDecrement
  );

  const newChannelWithResponding = channelWithResponding.installETHVirtualAppAgreementInstance(
    rightEthVirtualAppAgreementInstance,
    targetAppInstance.identityHash,
    initiatingBalanceDecrement,
    respondingBalanceDecrement
  );

  const leftCommitment = constructETHVirtualAppAgreementCommitment(
    context.network,
    newChannelWithInitiating,
    targetAppInstance.identityHash,
    leftEthVirtualAppAgreementInstance
  );

  const rightCommitment = constructETHVirtualAppAgreementCommitment(
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
  context: Context
): [ETHVirtualAppAgreementCommitment, VirtualAppSetStateCommitment] {
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
    bigNumberify(initiatingBalanceDecrement).add(respondingBalanceDecrement),
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
    newStateChannel.multisigAddress,
    newStateChannel
  );

  const rightCommitment = constructETHVirtualAppAgreementCommitment(
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
