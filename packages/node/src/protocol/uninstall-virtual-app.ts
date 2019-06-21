import { ETHBucketAppState, NetworkContext } from "@counterfactual/types";
import { BaseProvider } from "ethers/providers";
import { BigNumber } from "ethers/utils";
import { fromExtendedKey } from "ethers/utils/hdnode";

import { UninstallCommitment, VirtualAppSetStateCommitment } from "../ethereum";
import { VirtualChannelProtocolExecutionFlow } from "../machine";
import { Opcode, Protocol } from "../machine/enums";
import {
  ProtocolMessage,
  ProtocolParameters,
  UninstallVirtualAppParams,
  VirtualChannelIntermediaryProtocolContext,
  VirtualChannelProtocolContext
} from "../machine/types";
import { xkeyKthAddress } from "../machine/xkeys";
import { StateChannel } from "../models";

import { computeFreeBalanceIncrements } from "./utils/get-outcome-increments";
import { validateSignature } from "./utils/signature-validator";

const zA = (xpub: string) => {
  return fromExtendedKey(xpub).derivePath("0").address;
};

export const UNINSTALL_VIRTUAL_APP_PROTOCOL: VirtualChannelProtocolExecutionFlow = {
  0: async function*(context: VirtualChannelProtocolContext) {
    const {
      network,
      stateChannelWithCounterparty,
      provider,
      message: { params }
    } = context;

    const {
      intermediaryXpub,
      respondingXpub,
      targetAppIdentityHash
    } = params as UninstallVirtualAppParams;

    const intermediaryAddress = xkeyKthAddress(intermediaryXpub, 0);
    const respondingAddress = xkeyKthAddress(respondingXpub, 0);

    const lockCommitment = addVirtualAppStateTransitionToContext(
      context.message.params,
      context,
      false
    );

    const s1 = yield [Opcode.OP_SIGN, lockCommitment];

    const m4 = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        // m1
        protocol: Protocol.UninstallVirtualApp,
        protocolExecutionID: context.message.protocolExecutionID,
        params: context.message.params,
        seq: 1,
        toXpub: intermediaryXpub,
        signature: s1
      } as ProtocolMessage
    ];

    const { signature: s3, signature2: s2 } = m4;

    validateSignature(respondingAddress, lockCommitment, s3);
    validateSignature(intermediaryAddress, lockCommitment, s2, true);

    const increments = await getFreeBalanceIncrements(
      stateChannelWithCounterparty,
      targetAppIdentityHash,
      provider
    );

    const {
      leftChannel,
      leftUninstallCommitment
    } = await getLeftUninstallAgreement(
      params,
      increments,
      context.stateChannelWithIntermediary,
      network
    );

    context.stateChannelWithIntermediary = leftChannel;

    const s4 = yield [Opcode.OP_SIGN, leftUninstallCommitment];

    // send m5, wait for m6
    const { signature: s6 } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        protocolExecutionID: context.message.protocolExecutionID,
        seq: -1,
        toXpub: intermediaryXpub,
        signature: s4
      }
    ];

    validateSignature(intermediaryAddress, leftUninstallCommitment, s6);
    removeVirtualAppInstance(context.message.params, context);
  },

  1: async function*(context: VirtualChannelIntermediaryProtocolContext) {
    const {
      network,
      stateChannelWithCounterparty,
      provider,
      message: { params }
    } = context;

    const {
      initiatingXpub,
      respondingXpub,
      targetAppIdentityHash
    } = params as UninstallVirtualAppParams;

    const initiatingAddress = xkeyKthAddress(initiatingXpub, 0);
    const respondingAddress = xkeyKthAddress(respondingXpub, 0);

    const lockCommitment = addVirtualAppStateTransitionToContext(
      context.message.params,
      context,
      true
    );

    // m1 contains s1
    const s1 = context.message.signature;

    validateSignature(initiatingAddress, lockCommitment, s1);

    const s2 = yield [Opcode.OP_SIGN_AS_INTERMEDIARY, lockCommitment];

    const m3 = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        // m2
        protocol: Protocol.UninstallVirtualApp,
        protocolExecutionID: context.message.protocolExecutionID,
        params: context.message.params,
        seq: 2,
        toXpub: respondingXpub,
        signature: s1,
        signature2: s2
      } as ProtocolMessage
    ];
    const { signature: s3 } = m3;

    validateSignature(respondingAddress, lockCommitment, s3);

    const m5 = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        // m4
        protocol: Protocol.UninstallVirtualApp,
        protocolExecutionID: context.message.protocolExecutionID,
        seq: -1,
        toXpub: initiatingXpub,
        signature: s3,
        signature2: s2
      } as ProtocolMessage
    ];

    const increments = await getFreeBalanceIncrements(
      stateChannelWithCounterparty!,
      targetAppIdentityHash,
      provider
    );

    const { signature: s4 } = m5;

    const {
      leftChannel,
      leftUninstallCommitment
    } = await getLeftUninstallAgreement(
      params,
      increments,
      context.stateChannelWithInitiating,
      network
    );

    context.stateChannelWithInitiating = leftChannel;

    validateSignature(initiatingAddress, leftUninstallCommitment, s4);

    const s5 = yield [Opcode.OP_SIGN, leftUninstallCommitment];

    // send m6 without waiting for a reply
    yield [
      Opcode.IO_SEND,
      {
        protocol: Protocol.UninstallVirtualApp,
        protocolExecutionID: context.message.protocolExecutionID,
        seq: -1,
        toXpub: initiatingXpub,
        signature: s5
      } as ProtocolMessage
    ];

    const {
      rightChannel,
      rightUninstallCommitment
    } = await getRightUninstallAgreement(
      params,
      increments,
      context.stateChannelWithResponding,
      network
    );

    context.stateChannelWithResponding = rightChannel;

    const s6 = yield [Opcode.OP_SIGN, rightUninstallCommitment];

    const m8 = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        // m7
        protocol: Protocol.UninstallVirtualApp,
        protocolExecutionID: context.message.protocolExecutionID,
        seq: -1,
        toXpub: respondingXpub,
        signature: s6
      } as ProtocolMessage
    ];
    const { signature: s7 } = m8;

    validateSignature(respondingAddress, rightUninstallCommitment, s7);

    removeVirtualAppInstance(context.message.params, context);
  },

  2: async function*(context: VirtualChannelProtocolContext) {
    const {
      network,
      stateChannelWithCounterparty,
      provider,
      message: { signature: s1, signature2: s2, params }
    } = context;

    const {
      initiatingXpub,
      intermediaryXpub,
      targetAppIdentityHash
    } = params as UninstallVirtualAppParams;

    const initiatingAddress = xkeyKthAddress(initiatingXpub, 0);
    const intermediaryAddress = xkeyKthAddress(intermediaryXpub, 0);

    const lockCommitment = addVirtualAppStateTransitionToContext(
      params,
      context,
      false
    );

    validateSignature(initiatingAddress, lockCommitment, s1);
    validateSignature(intermediaryAddress, lockCommitment, s2, true);

    const s3 = yield [Opcode.OP_SIGN, lockCommitment];

    const m7 = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        // m3
        protocol: Protocol.UninstallVirtualApp,
        protocolExecutionID: context.message.protocolExecutionID,
        seq: -1,
        toXpub: intermediaryXpub,
        signature: s3
      } as ProtocolMessage
    ];

    const { signature: s6 } = m7;

    const increments = await getFreeBalanceIncrements(
      stateChannelWithCounterparty,
      targetAppIdentityHash,
      provider
    );

    const {
      rightChannel,
      rightUninstallCommitment
    } = await getRightUninstallAgreement(
      params,
      increments,
      context.stateChannelWithIntermediary,
      network
    );

    context.stateChannelWithIntermediary = rightChannel;

    validateSignature(intermediaryAddress, rightUninstallCommitment, s6);

    const s7 = yield [Opcode.OP_SIGN, rightUninstallCommitment];

    yield [
      Opcode.IO_SEND,
      {
        protocol: Protocol.UninstallVirtualApp,
        protocolExecutionID: context.message.protocolExecutionID,
        seq: -1,
        toXpub: intermediaryXpub,
        signature: s7
      } as ProtocolMessage
    ];

    removeVirtualAppInstance(context.message.params, context);
  }
};

function removeVirtualAppInstance(
  params: ProtocolParameters,
  context:
    | VirtualChannelProtocolContext
    | VirtualChannelIntermediaryProtocolContext
) {
  const { targetAppIdentityHash } = params as UninstallVirtualAppParams;

  context.stateChannelWithCounterparty = context.stateChannelWithCounterparty!.removeVirtualApp(
    targetAppIdentityHash
  );
}

function addVirtualAppStateTransitionToContext(
  params: ProtocolParameters,
  context:
    | VirtualChannelProtocolContext
    | VirtualChannelIntermediaryProtocolContext,
  isIntermediary: boolean
): VirtualAppSetStateCommitment {
  const {
    targetAppIdentityHash,
    targetAppState
  } = params as UninstallVirtualAppParams;

  let sc = context.stateChannelWithCounterparty!;

  if (isIntermediary) {
    sc = sc.setState(targetAppIdentityHash, targetAppState);
  }

  sc = sc.lockAppInstance(targetAppIdentityHash);
  const targetAppInstance = sc.getAppInstance(targetAppIdentityHash);

  context.stateChannelWithCounterparty = sc;

  // post-expiry lock commitment
  return new VirtualAppSetStateCommitment(
    context.network,
    targetAppInstance.identity,
    targetAppInstance.defaultTimeout,
    targetAppInstance.hashOfLatestState,
    targetAppInstance.appSeqNo
  );
}

function constructUninstallOp(
  network: NetworkContext,
  stateChannel: StateChannel,
  seqNoToUninstall: number
) {
  const freeBalance = stateChannel.freeBalance;

  return new UninstallCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    freeBalance.identity,
    freeBalance.state as ETHBucketAppState,
    freeBalance.nonce,
    freeBalance.timeout,
    seqNoToUninstall
  );
}

async function getFreeBalanceIncrements(
  metaChannel: StateChannel,
  targetAppIdentityHash: string,
  provider: BaseProvider
) {
  return await computeFreeBalanceIncrements(
    metaChannel,
    targetAppIdentityHash,
    provider
  );
}

async function getRightUninstallAgreement(
  params: ProtocolParameters,
  increments: { [x: string]: BigNumber },
  rightChannel: StateChannel,
  network: NetworkContext
): Promise<{
  rightChannel: StateChannel;
  rightUninstallCommitment: UninstallCommitment;
}> {
  const {
    initiatingXpub,
    intermediaryXpub,
    respondingXpub,
    targetAppIdentityHash
  } = params as UninstallVirtualAppParams;

  const agreementInstance = rightChannel.getTwoPartyVirtualEthAsLumpFromTarget(
    targetAppIdentityHash
  );

  const newStateChannel = rightChannel.uninstallTwoPartyVirtualEthAsLumpInstance(
    targetAppIdentityHash,
    {
      [zA(intermediaryXpub)]: increments[zA(initiatingXpub)],
      [zA(respondingXpub)]: increments[zA(respondingXpub)]
    }
  );

  return {
    rightChannel: newStateChannel,
    rightUninstallCommitment: constructUninstallOp(
      network,
      newStateChannel,
      agreementInstance.appSeqNo
    )
  };
}

async function getLeftUninstallAgreement(
  params: ProtocolParameters,
  increments: { [x: string]: BigNumber },
  leftChannel: StateChannel,
  network: NetworkContext
): Promise<{
  leftChannel: StateChannel;
  leftUninstallCommitment: UninstallCommitment;
}> {
  const {
    initiatingXpub,
    intermediaryXpub,
    respondingXpub,
    targetAppIdentityHash
  } = params as UninstallVirtualAppParams;

  const agreementInstance = leftChannel.getTwoPartyVirtualEthAsLumpFromTarget(
    targetAppIdentityHash
  );

  const newStateChannel = leftChannel.uninstallTwoPartyVirtualEthAsLumpInstance(
    targetAppIdentityHash,
    {
      [zA(intermediaryXpub)]: increments[zA(respondingXpub)],
      [zA(initiatingXpub)]: increments[zA(initiatingXpub)]
    }
  );

  return {
    leftChannel: newStateChannel,
    leftUninstallCommitment: constructUninstallOp(
      network,
      newStateChannel,
      agreementInstance.appSeqNo
    )
  };
}
