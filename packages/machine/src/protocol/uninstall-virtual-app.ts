import { UninstallCommitment } from "@counterfactual/machine/src/ethereum";
import { VirtualAppSetStateCommitment } from "@counterfactual/machine/src/ethereum/virtual-app-set-state-commitment";
import {
  AssetType,
  ETHBucketAppState,
  NetworkContext
} from "@counterfactual/types";

import { ProtocolExecutionFlow, StateChannel } from "..";
import { Opcode } from "../enums";
import { Context, ProtocolMessage, UninstallVirtualAppParams } from "../types";
import { virtualChannelKey } from "../virtual-app-key";

import { getChannelFromCounterparty } from "./utils/get-channel-from-counterparty";

export const UNINSTALL_VIRTUAL_APP_PROTOCOL: ProtocolExecutionFlow = {
  0: [
    addVirtualAppStateTransitionToContext,

    Opcode.OP_SIGN,

    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryAddress,
        initiatingAddress
      } = message.params as UninstallVirtualAppParams;

      context.outbox[0] = {
        ...message,
        seq: 1,
        fromAddress: initiatingAddress,
        toAddress: intermediaryAddress,
        signature: context.signatures[0]
      };
    },

    // send M1, wait for M4
    Opcode.IO_SEND_AND_WAIT,

    // TODO: Add signature verification

    addLeftUninstallAgreementToContext,

    Opcode.OP_SIGN,

    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryAddress,
        initiatingAddress
      } = message.params as UninstallVirtualAppParams;

      context.outbox[0] = {
        ...message,
        seq: -1,
        fromAddress: initiatingAddress,
        toAddress: intermediaryAddress,
        signature: context.signatures[0],
        signature2: context.inbox[0].signature
      };
    },

    // send M5, wait for M6
    Opcode.IO_SEND_AND_WAIT,

    // TODO: Add signature verification

    removeVirtualAppInstance

    // done!
  ],

  1: [
    addVirtualAppStateTransitionToContext,

    // TODO: Signature verification

    Opcode.OP_SIGN_AS_INTERMEDIARY,

    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryAddress,
        respondingAddress
      } = message.params as UninstallVirtualAppParams;

      context.outbox[0] = {
        ...message,
        seq: 2,
        fromAddress: intermediaryAddress,
        toAddress: respondingAddress,
        signature: message.signature,
        signature2: context.signatures[0]
      };
    },

    // send M2, wait for M3
    Opcode.IO_SEND_AND_WAIT,

    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryAddress,
        initiatingAddress
      } = message.params as UninstallVirtualAppParams;

      // - forward the lock signature
      // - send my own lock signature

      context.outbox[0] = {
        ...message,
        seq: -1,
        fromAddress: intermediaryAddress,
        toAddress: initiatingAddress,
        signature: context.inbox[0].signature,
        signature2: context.signatures[0]
      };
    },

    // send M4, wait for M5
    Opcode.IO_SEND_AND_WAIT,

    // TODO: Add signature verification

    addLeftUninstallAgreementToContext,

    Opcode.OP_SIGN,

    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryAddress,
        initiatingAddress
      } = message.params as UninstallVirtualAppParams;

      context.outbox[0] = {
        ...message,
        seq: -1,
        fromAddress: intermediaryAddress,
        toAddress: initiatingAddress,
        signature: context.signatures[2]
      };
    },

    // send M6
    Opcode.IO_SEND,

    addRightUninstallAgreementToContext,

    Opcode.OP_SIGN,

    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryAddress,
        respondingAddress
      } = message.params as UninstallVirtualAppParams;

      context.outbox[0] = {
        ...message,
        seq: -1,
        fromAddress: intermediaryAddress,
        toAddress: respondingAddress,
        signature: context.signatures[2]
      };
    },

    // send M7, wait for M8
    Opcode.IO_SEND_AND_WAIT,

    // TODO: Add signature verification

    removeVirtualAppInstance

    // done!
  ],

  2: [
    addVirtualAppStateTransitionToContext,

    // TODO: Add signature verification

    Opcode.OP_SIGN,

    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryAddress,
        respondingAddress
      } = message.params as UninstallVirtualAppParams;

      context.outbox[0] = {
        ...message,
        seq: -1,
        fromAddress: respondingAddress,
        toAddress: intermediaryAddress,
        signature: message.signature,
        signature2: message.signature2,
        signature3: context.signatures[0]
      };
    },

    // send M3, wait for M7
    Opcode.IO_SEND_AND_WAIT,

    // TODO: Add signature verification

    addRightUninstallAgreementToContext,

    Opcode.OP_SIGN,

    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryAddress,
        respondingAddress
      } = message.params as UninstallVirtualAppParams;

      context.outbox[0] = {
        ...message,
        seq: -1,
        fromAddress: respondingAddress,
        toAddress: intermediaryAddress,
        signature: context.signatures[0],
        signature2: context.signatures[1]
      };
    },

    // send M8
    Opcode.IO_SEND,

    removeVirtualAppInstance
  ]
};

function removeVirtualAppInstance(message: ProtocolMessage, context: Context) {
  const {
    intermediaryAddress,
    respondingAddress,
    initiatingAddress,
    targetAppIdentityHash
  } = message.params as UninstallVirtualAppParams;

  const key = virtualChannelKey(
    [initiatingAddress, respondingAddress],
    intermediaryAddress
  );

  const sc = context.stateChannelsMap.get(key)!;

  context.stateChannelsMap.set(key, sc.removeVirtualApp(targetAppIdentityHash));
}

function addVirtualAppStateTransitionToContext(
  message: ProtocolMessage,
  context: Context
) {
  const {
    intermediaryAddress,
    respondingAddress,
    initiatingAddress,
    targetAppIdentityHash
  } = message.params as UninstallVirtualAppParams;

  const key = virtualChannelKey(
    [initiatingAddress, respondingAddress],
    intermediaryAddress
  );

  const sc = context.stateChannelsMap.get(key);

  if (sc === undefined) {
    throw Error(
      `Unable to find channel object for ${initiatingAddress} and ${respondingAddress}`
    );
  }

  const newSc = sc.lockAppInstance(targetAppIdentityHash);
  const targetAppInstance = sc.getAppInstance(targetAppIdentityHash);

  context.stateChannelsMap.set(key, newSc);

  // post-expiry lock commitment
  context.commitments[0] = new VirtualAppSetStateCommitment(
    context.network,
    targetAppInstance.identity,
    targetAppInstance.defaultTimeout,
    targetAppInstance.hashOfLatestState,
    0
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

function addRightUninstallAgreementToContext(
  message: ProtocolMessage,
  context: Context
) {
  // uninstall right agreement
  const {
    intermediaryAddress,
    respondingAddress,
    targetAppIdentityHash,
    initiatingBalanceIncrement,
    respondingBalanceIncrement
  } = message.params as UninstallVirtualAppParams;

  const sc = getChannelFromCounterparty(
    context.stateChannelsMap,
    respondingAddress,
    intermediaryAddress
  )!;

  const agreementInstance = sc.getETHVirtualAppAgreementInstanceFromTarget(
    targetAppIdentityHash
  );

  const newStateChannel = sc.uninstallETHVirtualAppAgreementInstance(
    targetAppIdentityHash,
    {
      [sc.getFreeBalanceAddrOf(
        intermediaryAddress,
        AssetType.ETH
      )]: initiatingBalanceIncrement,
      [sc.getFreeBalanceAddrOf(
        respondingAddress,
        AssetType.ETH
      )]: respondingBalanceIncrement
    }
  );

  context.stateChannelsMap.set(sc.multisigAddress, newStateChannel);

  context.commitments[0] = constructUninstallOp(
    context.network,
    sc,
    agreementInstance.appSeqNo
  );
}

function addLeftUninstallAgreementToContext(
  message: ProtocolMessage,
  context: Context
) {
  // uninstall left virtual app agreement

  const {
    initiatingAddress,
    intermediaryAddress,
    targetAppIdentityHash,
    initiatingBalanceIncrement,
    respondingBalanceIncrement
  } = message.params as UninstallVirtualAppParams;

  const sc = getChannelFromCounterparty(
    context.stateChannelsMap,
    initiatingAddress,
    intermediaryAddress
  )!;

  const agreementInstance = sc.getETHVirtualAppAgreementInstanceFromTarget(
    targetAppIdentityHash
  );

  const newStateChannel = sc.uninstallETHVirtualAppAgreementInstance(
    targetAppIdentityHash,
    {
      [sc.getFreeBalanceAddrOf(
        initiatingAddress,
        AssetType.ETH
      )]: initiatingBalanceIncrement,
      [sc.getFreeBalanceAddrOf(
        intermediaryAddress,
        AssetType.ETH
      )]: respondingBalanceIncrement
    }
  );

  context.stateChannelsMap.set(sc.multisigAddress, newStateChannel);

  context.commitments[0] = constructUninstallOp(
    context.network,
    sc,
    agreementInstance.appSeqNo
  );
}
