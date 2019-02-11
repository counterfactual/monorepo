import { UninstallCommitment } from "@counterfactual/machine/src/ethereum";
import { VirtualAppSetStateCommitment } from "@counterfactual/machine/src/ethereum/virtual-app-set-state-commitment";
import {
  AssetType,
  ETHBucketAppState,
  NetworkContext
} from "@counterfactual/types";
import { AddressZero } from "ethers/constants";

import { ProtocolExecutionFlow, StateChannel } from "..";
import { Opcode } from "../enums";
import { Context, ProtocolMessage, UninstallVirtualAppParams } from "../types";

export const UNINSTALL_VIRTUAL_APP_PROTOCOL: ProtocolExecutionFlow = {
  0: [
    p1,
    Opcode.OP_SIGN,
    // send M1, wait for M4
    Opcode.IO_SEND_AND_WAIT,

    uninstallLeftAgreement,

    Opcode.OP_SIGN,
    // send M5, wait for M6
    Opcode.IO_SEND_AND_WAIT
    // done!
  ],

  1: [
    p1,
    Opcode.OP_SIGN_AS_INTERMEDIARY,
    // send M2, wait for M3
    Opcode.IO_SEND_AND_WAIT,
    (message: ProtocolMessage, context: Context) => {
      const {
        intermediaryAddress,
        respondingAddress
      } = message.params as UninstallVirtualAppParams;

      // - forward the lock signature
      // - send my own lock signature

      context.outbox[0] = {
        ...message,
        seq: 2,
        fromAddress: intermediaryAddress,
        toAddress: respondingAddress,
        signature: context.inbox[0].signature,
        signature2: context.signatures[0]
      };
    },
    // send M4, wait for M5
    Opcode.IO_SEND_AND_WAIT,
    uninstallLeftAgreement,
    Opcode.OP_SIGN,
    // send M6
    Opcode.IO_SEND,

    uninstallRightAgreement,
    Opcode.OP_SIGN,
    // send M7, wait for M8
    Opcode.IO_SEND_AND_WAIT
    // done!
  ],

  2: [
    p1,
    Opcode.OP_SIGN,
    // send M3, wait for M7
    Opcode.IO_SEND_AND_WAIT,
    uninstallRightAgreement,
    Opcode.OP_SIGN,
    // send M8
    Opcode.IO_SEND
  ]
};

function p1(message: ProtocolMessage, context: Context) {
  const sc = context.stateChannelsMap.get(AddressZero);
  if (sc === undefined) {
    throw Error();
  }
  const { targetAppIdentityHash } = message.params as UninstallVirtualAppParams;

  const newSc = sc.lockAppInstance(targetAppIdentityHash);
  const targetAppInstance = sc.getAppInstance(targetAppIdentityHash);

  context.stateChannelsMap.set(AddressZero, newSc);

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

function uninstallRightAgreement(message: ProtocolMessage, context: Context) {
  // uninstall right agreement
  const {
    intermediaryAddress,
    respondingAddress,
    multisig2Address,
    targetAppIdentityHash,
    initiatingBalanceIncrement,
    respondingBalanceIncrement
  } = message.params as UninstallVirtualAppParams;

  const sc = context.stateChannelsMap.get(multisig2Address)!;

  const agreementInstance = sc.getETHVirtualAppAgreementInstanceFromTarget(
    targetAppIdentityHash
  );

  const newStateChannel = sc.uninstallETHVirtualAppAgreementInstance(
    targetAppIdentityHash,
    {
      [intermediaryAddress]: initiatingBalanceIncrement,
      [respondingAddress]: respondingBalanceIncrement
    }
  );

  context.stateChannelsMap.set!(multisig2Address, newStateChannel);

  context.commitments[0] = constructUninstallOp(
    context.network,
    sc,
    agreementInstance.appSeqNo
  );
}

function uninstallLeftAgreement(message: ProtocolMessage, context: Context) {
  // uninstall left virtual app agreement

  const {
    initiatingAddress,
    intermediaryAddress,
    multisig1Address,
    targetAppIdentityHash,
    initiatingBalanceIncrement,
    respondingBalanceIncrement
  } = message.params as UninstallVirtualAppParams;

  const sc = context.stateChannelsMap.get(multisig1Address)!;

  const agreementInstance = sc.getETHVirtualAppAgreementInstanceFromTarget(
    targetAppIdentityHash
  );

  const newStateChannel = sc.uninstallETHVirtualAppAgreementInstance(
    targetAppIdentityHash,
    {
      [initiatingAddress]: initiatingBalanceIncrement,
      [intermediaryAddress]: respondingBalanceIncrement
    }
  );

  context.stateChannelsMap.set!(multisig1Address, newStateChannel);

  context.commitments[0] = constructUninstallOp(
    context.network,
    sc,
    agreementInstance.appSeqNo
  );
}
