import { VirtualAppSetStateCommitment } from "@counterfactual/machine/src/ethereum/virtual-app-set-state-commitment";
import { AddressZero } from "ethers/constants";
import { BigNumber } from "ethers/utils";

import { ProtocolExecutionFlow } from "..";
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

      const newStateChannel = context.stateChannelsMap
        .get(multisig1Address)!
        .uninstallETHVirtualAppAgreementInstance(targetAppIdentityHash, {
          [initiatingAddress]: new BigNumber(0).sub(initiatingBalanceDecrement),
          [respondingAddress]: new BigNumber(0).sub(respondingBalanceDecrement)
        });

      context.stateChannelsMap.set!(multisig1Address, newStateChannel);
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
