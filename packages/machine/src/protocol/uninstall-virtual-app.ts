import {
  AssetType,
  ETHBucketAppState,
  NetworkContext
} from "@counterfactual/types";
import { BaseProvider } from "ethers/providers";

import { ProtocolExecutionFlow } from "..";
import { Opcode } from "../enums";
import { UninstallCommitment, VirtualAppSetStateCommitment } from "../ethereum";
import { StateChannel } from "../models";
import {
  Context,
  ProtocolParameters,
  UninstallVirtualAppParams
} from "../types";
import { virtualChannelKey } from "../virtual-app-key";
import { xkeyKthAddress } from "../xkeys";

import { getChannelFromCounterparty } from "./utils/get-channel-from-counterparty";
import { computeFreeBalanceIncrements } from "./utils/get-resolution-increments";
import { validateSignature } from "./utils/signature-validator";

export const UNINSTALL_VIRTUAL_APP_PROTOCOL: ProtocolExecutionFlow = {
  0: async function*(context: Context) {
    const { intermediaryXpub, respondingXpub } = context.message
      .params as UninstallVirtualAppParams;
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
        ...context.message,
        seq: 1,
        toXpub: intermediaryXpub,
        signature: s1
      }
    ];

    const { signature: s3, signature2: s2 } = m4;

    validateSignature(respondingAddress, lockCommitment, s3);
    validateSignature(intermediaryAddress, lockCommitment, s2, true);

    const uninstallLeft = await addLeftUninstallAgreementToContext(
      context.message.params,
      context,
      context.provider
    );

    const s4 = yield [Opcode.OP_SIGN, uninstallLeft];

    // send m5, wait for m6
    const { signature: s6 } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        ...context.message,
        seq: -1,
        toXpub: intermediaryXpub,
        signature: s4
      }
    ];

    validateSignature(intermediaryAddress, uninstallLeft, s6);
    removeVirtualAppInstance(context.message.params, context);
  },

  1: async function*(context: Context) {
    const { initiatingXpub, respondingXpub } = context.message
      .params as UninstallVirtualAppParams;
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
        ...context.message,
        seq: 2,
        toXpub: respondingXpub,
        signature: s1,
        signature2: s2
      }
    ];
    const { signature: s3 } = m3;

    validateSignature(respondingAddress, lockCommitment, s3);

    const m5 = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        // m4
        ...context.message,
        seq: -1,
        toXpub: initiatingXpub,
        signature: s3,
        signature2: s2
      }
    ];
    const { signature: s4 } = m5;

    const leftUninstallCommitment = await addLeftUninstallAgreementToContext(
      context.message.params,
      context,
      context.provider
    );

    validateSignature(initiatingAddress, leftUninstallCommitment, s4);

    const s5 = yield [Opcode.OP_SIGN, leftUninstallCommitment];

    // send m6 without waiting for a reply
    yield [
      Opcode.IO_SEND,
      {
        ...context.message,
        seq: -1,
        toXpub: initiatingXpub,
        signature: s5
      }
    ];

    const rightUninstallCommitment = await addRightUninstallAgreementToContext(
      context.message.params,
      context,
      context.provider
    );

    const s6 = yield [Opcode.OP_SIGN, rightUninstallCommitment];

    const m8 = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        // m7
        ...context.message,
        seq: -1,
        toXpub: respondingXpub,
        signature: s6
      }
    ];
    const { signature: s7 } = m8;

    validateSignature(respondingAddress, rightUninstallCommitment, s7);

    removeVirtualAppInstance(context.message.params, context);
  },

  2: async function*(context: Context) {
    const { initiatingXpub, intermediaryXpub } = context.message
      .params as UninstallVirtualAppParams;
    const initiatingAddress = xkeyKthAddress(initiatingXpub, 0);
    const intermediaryAddress = xkeyKthAddress(intermediaryXpub, 0);

    const lockCommitment = addVirtualAppStateTransitionToContext(
      context.message.params,
      context,
      false
    );

    const { signature: s1, signature2: s2 } = context.message;

    validateSignature(initiatingAddress, lockCommitment, s1);
    validateSignature(intermediaryAddress, lockCommitment, s2, true);

    const s3 = yield [Opcode.OP_SIGN, lockCommitment];

    const m7 = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        // m3
        ...context.message,
        seq: -1,
        toXpub: intermediaryXpub,
        signature: s3
      }
    ];
    const { signature: s6 } = m7;

    const rightUninstallCommitment = await addRightUninstallAgreementToContext(
      context.message.params,
      context,
      context.provider
    );

    validateSignature(intermediaryAddress, rightUninstallCommitment, s6);

    const s7 = yield [Opcode.OP_SIGN, rightUninstallCommitment];

    yield [
      Opcode.IO_SEND,
      {
        ...context.message,
        seq: -1,
        toXpub: intermediaryXpub,
        signature: s7
      }
    ];

    removeVirtualAppInstance(context.message.params, context);
  }
};

function removeVirtualAppInstance(
  params: ProtocolParameters,
  context: Context
) {
  const {
    intermediaryXpub,
    respondingXpub,
    initiatingXpub,
    targetAppIdentityHash
  } = params as UninstallVirtualAppParams;

  const key = virtualChannelKey(
    [initiatingXpub, respondingXpub],
    intermediaryXpub
  );

  const sc = context.stateChannelsMap.get(key)!;

  context.stateChannelsMap.set(key, sc.removeVirtualApp(targetAppIdentityHash));
}

function addVirtualAppStateTransitionToContext(
  params: ProtocolParameters,
  context: Context,
  isIntermediary: boolean
): VirtualAppSetStateCommitment {
  const {
    intermediaryXpub,
    respondingXpub,
    initiatingXpub,
    targetAppIdentityHash,
    targetAppState
  } = params as UninstallVirtualAppParams;

  const key = virtualChannelKey(
    [initiatingXpub, respondingXpub],
    intermediaryXpub
  );

  let sc = context.stateChannelsMap.get(key) as StateChannel;

  if (isIntermediary) {
    sc = sc.setState(targetAppIdentityHash, targetAppState);
  }

  sc = sc.lockAppInstance(targetAppIdentityHash);
  const targetAppInstance = sc.getAppInstance(targetAppIdentityHash);

  context.stateChannelsMap.set(key, sc);

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
  const freeBalance = stateChannel.getFreeBalanceFor(AssetType.ETH);

  return new UninstallCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    freeBalance.identity,
    freeBalance.terms,
    freeBalance.state as ETHBucketAppState,
    freeBalance.nonce,
    freeBalance.timeout,
    seqNoToUninstall
  );
}

async function addRightUninstallAgreementToContext(
  params: ProtocolParameters,
  context: Context,
  provider: BaseProvider
) {
  // uninstall right agreement
  const {
    initiatingXpub,
    intermediaryXpub,
    respondingXpub,
    targetAppIdentityHash
  } = params as UninstallVirtualAppParams;

  const key = virtualChannelKey(
    [initiatingXpub, respondingXpub],
    intermediaryXpub
  );

  const metachannel = context.stateChannelsMap.get(key) as StateChannel;

  const increments = await computeFreeBalanceIncrements(
    metachannel,
    targetAppIdentityHash,
    provider
  );

  const sc = getChannelFromCounterparty(
    context.stateChannelsMap,
    respondingXpub,
    intermediaryXpub
  )!;

  const agreementInstance = sc.getETHVirtualAppAgreementInstanceFromTarget(
    targetAppIdentityHash
  );

  const newStateChannel = sc.uninstallETHVirtualAppAgreementInstance(
    targetAppIdentityHash,
    {
      [intermediaryXpub]: increments[xkeyKthAddress(initiatingXpub, 0)],
      [respondingXpub]: increments[xkeyKthAddress(respondingXpub, 0)]
    }
  );

  context.stateChannelsMap.set(sc.multisigAddress, newStateChannel);

  return constructUninstallOp(context.network, sc, agreementInstance.appSeqNo);
}

async function addLeftUninstallAgreementToContext(
  params: ProtocolParameters,
  context: Context,
  provider: BaseProvider
): Promise<UninstallCommitment> {
  // uninstall left virtual app agreement

  const {
    initiatingXpub,
    intermediaryXpub,
    respondingXpub,
    targetAppIdentityHash
  } = params as UninstallVirtualAppParams;

  const key = virtualChannelKey(
    [initiatingXpub, respondingXpub],
    intermediaryXpub
  );

  const metachannel = context.stateChannelsMap.get(key) as StateChannel;

  const increments = await computeFreeBalanceIncrements(
    metachannel,
    targetAppIdentityHash,
    provider
  );

  const sc = getChannelFromCounterparty(
    context.stateChannelsMap,
    initiatingXpub,
    intermediaryXpub
  )!;

  const agreementInstance = sc.getETHVirtualAppAgreementInstanceFromTarget(
    targetAppIdentityHash
  );

  const newStateChannel = sc.uninstallETHVirtualAppAgreementInstance(
    targetAppIdentityHash,
    {
      [intermediaryXpub]: increments[xkeyKthAddress(respondingXpub, 0)],
      [initiatingXpub]: increments[xkeyKthAddress(initiatingXpub, 0)]
    }
  );

  context.stateChannelsMap.set(sc.multisigAddress, newStateChannel);

  return constructUninstallOp(context.network, sc, agreementInstance.appSeqNo);
}
