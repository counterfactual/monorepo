import { UninstallCommitment } from "@counterfactual/machine/src/ethereum";
import { VirtualAppSetStateCommitment } from "@counterfactual/machine/src/ethereum/virtual-app-set-state-commitment";
import {
  AssetType,
  ETHBucketAppState,
  NetworkContext
} from "@counterfactual/types";
import { AddressZero } from "ethers/constants";
import { BigNumber } from "ethers/utils";

import { ProtocolExecutionFlow, StateChannel } from "..";
import { Opcode } from "../enums";
import { Context, ProtocolMessage, UninstallVirtualAppParams } from "../types";

const NONCE_EXPIRY = 65536;

export const UNINSTALL_VIRTUAL_APP_PROTOCOL: ProtocolExecutionFlow = {
  0: [
    p1,
    Opcode.OP_SIGN,
    // send M1, wait for M4
    Opcode.IO_SEND_AND_WAIT,

    // uninstall the virtual app agreement
    (message: ProtocolMessage, context: Context) => {
      const {
        initiatingAddress,
        respondingAddress,
        multisig1Address,
        targetAppIdentityHash,
        initiatingBalanceDecrement,
        respondingBalanceDecrement
      } = message.params as UninstallVirtualAppParams;

      const sc = context.stateChannelsMap.get(multisig1Address)!;

      const agreementInstance = sc.getETHVirtualAppAgreementInstanceFromTarget(
        targetAppIdentityHash
      );

      const newStateChannel = sc.uninstallETHVirtualAppAgreementInstance(
        targetAppIdentityHash,
        {
          [initiatingAddress]: new BigNumber(0).sub(initiatingBalanceDecrement),
          [respondingAddress]: new BigNumber(0).sub(respondingBalanceDecrement)
        }
      );

      context.stateChannelsMap.set!(multisig1Address, newStateChannel);

      context.commitments[0] = constructUninstallOp(
        context.network,
        sc,
        agreementInstance.appSeqNo
      );
    },
    Opcode.OP_SIGN,
    // send M5, wait for M6
    Opcode.IO_SEND_AND_WAIT
  ],

  1: [
    p1,
    Opcode.OP_SIGN_AS_INTERMEDIARY,
    // send M2, wait for M3
    Opcode.IO_SEND_AND_WAIT
  ],

  2: [
    p1,
    Opcode.OP_SIGN,
    // send M3, wait for M7
    Opcode.IO_SEND_AND_WAIT
  ]
};

function p1(message: ProtocolMessage, context: Context) {
  const sc = context.stateChannelsMap.get(AddressZero);
  if (sc === undefined) {
    throw Error();
  }
  const { targetAppIdentityHash } = message.params as UninstallVirtualAppParams;

  const newSc = sc.lockAppInstance(targetAppIdentityHash, NONCE_EXPIRY);
  const targetAppInstance = sc.getAppInstance(targetAppIdentityHash);

  context.stateChannelsMap.set(AddressZero, newSc);

  // post-expiry lock commitment
  context.commitments[0] = new VirtualAppSetStateCommitment(
    context.network,
    targetAppInstance.identity,
    NONCE_EXPIRY,
    targetAppInstance.defaultTimeout,
    targetAppInstance.hashOfLatestState,
    0
  );
}

export function constructUninstallOp(
  network: NetworkContext,
  stateChannel: StateChannel,
  uninstallTargetId: number
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
    uninstallTargetId
  );
}
