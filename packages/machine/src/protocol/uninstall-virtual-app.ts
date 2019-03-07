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
import { Context, ProtocolMessage, UninstallVirtualAppParams } from "../types";
import { virtualChannelKey } from "../virtual-app-key";
import { xkeyKthAddress } from "../xkeys";

import { getChannelFromCounterparty } from "./utils/get-channel-from-counterparty";
import { computeFreeBalanceIncrements } from "./utils/get-resolution-increments";
import { validateSignature } from "./utils/signature-validator";

type UninstallVirtualProtocolMessage = ProtocolMessage & {
  params: UninstallVirtualAppParams;
};

export const UNINSTALL_VIRTUAL_APP_PROTOCOL: ProtocolExecutionFlow = {
  0: [
    addVirtualAppStateTransitionToContext(false),

    Opcode.OP_SIGN,

    (message: UninstallVirtualProtocolMessage, context: Context) => {
      const { intermediaryXpub, initiatingXpub } = message.params;

      context.outbox[0] = {
        ...message,
        seq: 1,
        fromXpub: initiatingXpub,
        toXpub: intermediaryXpub,
        signature: context.signatures[0]
      };
    },

    // send M1, wait for M4
    Opcode.IO_SEND_AND_WAIT,

    // verify M4
    (message: ProtocolMessage, context: Context) => {
      const {
        respondingXpub,
        intermediaryXpub
      } = message.params as UninstallVirtualAppParams;

      validateSignature(
        xkeyKthAddress(respondingXpub, 0),
        context.commitments[0],
        context.inbox[0].signature // s3
      );

      validateSignature(
        xkeyKthAddress(intermediaryXpub, 0),
        context.commitments[0],
        context.inbox[0].signature2, // s2
        true
      );
    },

    addLeftUninstallAgreementToContext,

    Opcode.OP_SIGN,

    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryXpub,
        initiatingXpub
      } = message.params as UninstallVirtualAppParams;

      context.outbox[0] = {
        ...message,
        seq: -1,
        fromXpub: initiatingXpub,
        toXpub: intermediaryXpub,
        signature: context.signatures[0]
      };
    },

    // send M5, wait for M6
    Opcode.IO_SEND_AND_WAIT,

    // verify M6
    (message: ProtocolMessage, context: Context) => {
      const { intermediaryXpub } = message.params as UninstallVirtualAppParams;
      validateSignature(
        xkeyKthAddress(intermediaryXpub, 0),
        context.commitments[0],
        context.inbox[1].signature
      );
    },

    removeVirtualAppInstance

    // done!
  ],

  1: [
    addVirtualAppStateTransitionToContext(true),

    (message: ProtocolMessage, context: Context) => {
      validateSignature(
        xkeyKthAddress(message.params.initiatingXpub, 0),
        context.commitments[0],
        message.signature
      );
    },

    Opcode.OP_SIGN_AS_INTERMEDIARY,

    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryXpub,
        respondingXpub
      } = message.params as UninstallVirtualAppParams;

      context.outbox[0] = {
        ...message,
        seq: 2,
        fromXpub: intermediaryXpub,
        toXpub: respondingXpub,
        signature: message.signature,
        signature2: context.signatures[0]
      };
    },

    // send M2, wait for M3
    Opcode.IO_SEND_AND_WAIT,

    // verify M3
    (message: ProtocolMessage, context: Context) => {
      validateSignature(
        xkeyKthAddress(message.params.respondingXpub, 0),
        context.commitments[0],
        context.inbox[0].signature
      );
    },

    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryXpub,
        initiatingXpub
      } = message.params as UninstallVirtualAppParams;

      context.outbox[0] = {
        ...message,
        seq: -1,
        fromXpub: intermediaryXpub,
        toXpub: initiatingXpub,
        signature: context.inbox[0].signature, // s3
        signature2: context.signatures[0] // s2
      };
    },

    // send M4, wait for M5
    Opcode.IO_SEND_AND_WAIT,

    addLeftUninstallAgreementToContext,

    // verify M5
    (message: ProtocolMessage, context: Context) => {
      // todo(xuanji): why does the message end up in inbox[1]?
      validateSignature(
        xkeyKthAddress(message.params.initiatingXpub, 0),
        context.commitments[0],
        context.inbox[1].signature
      );
    },

    Opcode.OP_SIGN,

    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryXpub,
        initiatingXpub
      } = message.params as UninstallVirtualAppParams;

      context.outbox[0] = {
        ...message,
        seq: -1,
        fromXpub: intermediaryXpub,
        toXpub: initiatingXpub,
        signature: context.signatures[0]
      };
    },

    // send M6
    Opcode.IO_SEND,

    addRightUninstallAgreementToContext,

    Opcode.OP_SIGN,

    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryXpub,
        respondingXpub
      } = message.params as UninstallVirtualAppParams;

      context.outbox[0] = {
        ...message,
        seq: -1,
        fromXpub: intermediaryXpub,
        toXpub: respondingXpub,
        signature: context.signatures[0]
      };
    },

    // send M7, wait for M8
    Opcode.IO_SEND_AND_WAIT,

    // verify M8
    (message: ProtocolMessage, context: Context) => {
      const { respondingXpub } = message.params as UninstallVirtualAppParams;
      validateSignature(
        xkeyKthAddress(respondingXpub, 0),
        context.commitments[0],
        context.inbox[2].signature
      );
    },

    removeVirtualAppInstance

    // done!
  ],

  2: [
    addVirtualAppStateTransitionToContext(false),

    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryXpub,
        initiatingXpub
      } = message.params as UninstallVirtualAppParams;

      validateSignature(
        xkeyKthAddress(initiatingXpub, 0),
        context.commitments[0],
        message.signature
      );

      validateSignature(
        xkeyKthAddress(intermediaryXpub, 0),
        context.commitments[0],
        message.signature2,
        true
      );
    },

    Opcode.OP_SIGN,

    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryXpub,
        respondingXpub
      } = message.params as UninstallVirtualAppParams;

      context.outbox[0] = {
        ...message,
        seq: -1,
        fromXpub: respondingXpub,
        toXpub: intermediaryXpub,
        signature: context.signatures[0]
      };
    },

    // send M3, wait for M7
    Opcode.IO_SEND_AND_WAIT,

    addRightUninstallAgreementToContext,

    // verify M7
    (message: ProtocolMessage, context: Context) => {
      const { intermediaryXpub } = message.params as UninstallVirtualAppParams;
      validateSignature(
        xkeyKthAddress(intermediaryXpub, 0),
        context.commitments[0],
        context.inbox[0].signature
      );
    },

    Opcode.OP_SIGN,

    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryXpub,
        respondingXpub
      } = message.params as UninstallVirtualAppParams;

      context.outbox[0] = {
        ...message,
        seq: -1,
        fromXpub: respondingXpub,
        toXpub: intermediaryXpub,
        signature: context.signatures[0]
      };
    },

    // send M8
    Opcode.IO_SEND,

    removeVirtualAppInstance
  ]
};

function removeVirtualAppInstance(
  message: UninstallVirtualProtocolMessage,
  context: Context
) {
  const {
    intermediaryXpub,
    respondingXpub,
    initiatingXpub,
    targetAppIdentityHash
  } = message.params;

  const key = virtualChannelKey(
    [initiatingXpub, respondingXpub],
    intermediaryXpub
  );

  const sc = context.stateChannelsMap.get(key)!;

  context.stateChannelsMap.set(key, sc.removeVirtualApp(targetAppIdentityHash));
}

function addVirtualAppStateTransitionToContext(isIntermediary: boolean) {
  return function(message: ProtocolMessage, context: Context) {
    const {
      intermediaryXpub,
      respondingXpub,
      initiatingXpub,
      targetAppIdentityHash,
      targetAppState
    } = message.params as UninstallVirtualAppParams;

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
    context.commitments[0] = new VirtualAppSetStateCommitment(
      context.network,
      targetAppInstance.identity,
      targetAppInstance.defaultTimeout,
      targetAppInstance.hashOfLatestState,
      targetAppInstance.appSeqNo
    );
  };
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
  message: UninstallVirtualProtocolMessage,
  context: Context,
  provider: BaseProvider
) {
  // uninstall right agreement
  const {
    initiatingXpub,
    intermediaryXpub,
    respondingXpub,
    targetAppIdentityHash
  } = message.params;

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

  context.commitments[0] = constructUninstallOp(
    context.network,
    sc,
    agreementInstance.appSeqNo
  );
}

async function addLeftUninstallAgreementToContext(
  message: UninstallVirtualProtocolMessage,
  context: Context,
  provider: BaseProvider
) {
  const {
    initiatingXpub,
    intermediaryXpub,
    respondingXpub,
    targetAppIdentityHash
  } = message.params;

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

  context.commitments[0] = constructUninstallOp(
    context.network,
    sc,
    agreementInstance.appSeqNo
  );
}
