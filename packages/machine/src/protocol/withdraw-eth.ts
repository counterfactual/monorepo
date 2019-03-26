import {
  AssetType,
  ETHBucketAppState,
  NetworkContext
} from "@counterfactual/types";
import { AddressZero, Zero } from "ethers/constants";

import { ProtocolExecutionFlow } from "..";
import { Opcode, Protocol } from "../enums";
import {
  InstallCommitment,
  UninstallCommitment,
  WithdrawETHCommitment
} from "../ethereum";
import { AppInstance, StateChannel } from "../models";
import {
  Context,
  ProtocolMessage,
  ProtocolParameters,
  WithdrawParams
} from "../types";
import { xkeyKthAddress } from "../xkeys";

import { validateSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 * https://specs.counterfactual.com/11-withdraw-protocol *
 */
export const WITHDRAW_ETH_PROTOCOL: ProtocolExecutionFlow = {
  0: async function*(context: Context) {
    const { respondingXpub, multisigAddress } = context.message
      .params as WithdrawParams;
    const respondingAddress = xkeyKthAddress(respondingXpub, 0);

    const [
      installRefundCommitment,
      refundAppIdentityHash
    ] = addInstallRefundAppCommitmentToContext(context.message.params, context);

    const withdrawETHCommitment = addMultisigSendCommitmentToContext(
      context.message,
      context
    );

    const s1 = yield [Opcode.OP_SIGN, installRefundCommitment];
    const s3 = yield [Opcode.OP_SIGN, withdrawETHCommitment];

    const m2 = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        ...context.message,
        toXpub: respondingXpub,
        signature: s1,
        signature2: s3,
        seq: 1
      }
    ];

    const { signature: s2, signature2: s4, signature3: s6 } = m2;

    const uninstallRefundCommitment = addUninstallRefundAppCommitmentToContext(
      context.message,
      context,
      refundAppIdentityHash
    );

    validateSignature(respondingAddress, installRefundCommitment, s2);
    validateSignature(respondingAddress, withdrawETHCommitment, s4);
    validateSignature(respondingAddress, uninstallRefundCommitment, s6);

    const s5 = yield [Opcode.OP_SIGN, uninstallRefundCommitment];

    yield [
      Opcode.IO_SEND,
      {
        ...context.message,
        toXpub: respondingXpub,
        signature: s5,
        seq: -1
      }
    ];

    const finalCommitment = withdrawETHCommitment.transaction([s3, s4]);

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Withdraw,
      finalCommitment,
      multisigAddress
    ];
  },

  1: async function*(context: Context) {
    const { initiatingXpub, multisigAddress } = context.message
      .params as WithdrawParams;
    const initiatingAddress = xkeyKthAddress(initiatingXpub, 0);

    const [
      installRefundCommitment,
      refundAppIdentityHash
    ] = addInstallRefundAppCommitmentToContext(context.message.params, context);

    const withdrawETHCommitment = addMultisigSendCommitmentToContext(
      context.message,
      context
    );
    const uninstallRefundCommitment = addUninstallRefundAppCommitmentToContext(
      context.message,
      context,
      refundAppIdentityHash
    );

    const { signature: s1, signature2: s3 } = context.message;

    validateSignature(initiatingAddress, installRefundCommitment, s1);

    validateSignature(initiatingAddress, withdrawETHCommitment, s3);

    const s2 = yield [Opcode.OP_SIGN, installRefundCommitment];
    const s4 = yield [Opcode.OP_SIGN, withdrawETHCommitment];
    const s6 = yield [Opcode.OP_SIGN, uninstallRefundCommitment];

    const finalCommitment = withdrawETHCommitment.transaction([s3, s4]);
    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Withdraw,
      finalCommitment,
      multisigAddress
    ];

    const m3 = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        ...context.message,
        toXpub: initiatingXpub,
        signature: s2,
        signature2: s4,
        signature3: s6,
        seq: -1
      }
    ];

    const { signature: s5 } = m3;

    validateSignature(initiatingAddress, uninstallRefundCommitment, s5);

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Withdraw,
      finalCommitment,
      multisigAddress
    ];
  }
};

function addInstallRefundAppCommitmentToContext(
  params: ProtocolParameters,
  context: Context
): [InstallCommitment, string] {
  const {
    recipient,
    amount,
    multisigAddress,
    initiatingXpub
  } = params as WithdrawParams;

  const stateChannel = context.stateChannelsMap.get(multisigAddress)!;

  const appInstance = new AppInstance(
    multisigAddress,
    stateChannel.getNextSigningKeys(),
    1008,
    {
      addr: context.network.ETHBalanceRefund,
      stateEncoding:
        "tuple(address recipient, address multisig,  uint256 threshold)",
      actionEncoding: undefined
    },
    {
      assetType: AssetType.ETH,
      limit: amount,
      token: AddressZero
    },
    false,
    stateChannel.numInstalledApps,
    stateChannel.rootNonceValue,
    {
      recipient,
      multisig: multisigAddress,
      threshold: amount
    },
    0,
    1008
  );

  let aliceBalanceDecrement = Zero;
  let bobBalanceDecrement = Zero;

  if (
    stateChannel.getFreeBalanceAddrOf(initiatingXpub, AssetType.ETH) ===
    stateChannel.multisigOwners[0]
  ) {
    aliceBalanceDecrement = amount;
  } else {
    bobBalanceDecrement = amount;
  }

  const newStateChannel = stateChannel.installApp(
    appInstance,
    aliceBalanceDecrement,
    bobBalanceDecrement
  );
  context.stateChannelsMap.set(
    newStateChannel.multisigAddress,
    newStateChannel
  );

  const installRefundCommitment = constructInstallOp(
    context.network,
    newStateChannel,
    appInstance.identityHash
  );

  return [installRefundCommitment, appInstance.identityHash];
}

function addUninstallRefundAppCommitmentToContext(
  message: ProtocolMessage,
  context: Context,
  appIdentityHash: string
): UninstallCommitment {
  const { multisigAddress } = message.params as WithdrawParams;

  const stateChannel = context.stateChannelsMap.get(multisigAddress)!;

  const newStateChannel = stateChannel.uninstallApp(
    appIdentityHash,
    Zero,
    Zero
  );
  context.stateChannelsMap.set(
    newStateChannel.multisigAddress,
    newStateChannel
  );

  const freeBalance = stateChannel.getFreeBalanceFor(AssetType.ETH);

  const uninstallCommitment = new UninstallCommitment(
    context.network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    freeBalance.identity,
    freeBalance.terms,
    freeBalance.state as ETHBucketAppState,
    freeBalance.nonce,
    freeBalance.timeout,
    freeBalance.appSeqNo
  );

  return uninstallCommitment;
}

function addMultisigSendCommitmentToContext(
  message: ProtocolMessage,
  context: Context
) {
  const {
    recipient,
    amount,
    multisigAddress
  } = message.params as WithdrawParams;

  const stateChannel = context.stateChannelsMap.get(multisigAddress)!;

  return new WithdrawETHCommitment(
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    recipient,
    amount
  );
}

function constructInstallOp(
  network: NetworkContext,
  stateChannel: StateChannel,
  appIdentityHash: string
) {
  const app = stateChannel.getAppInstance(appIdentityHash);

  const freeBalance = stateChannel.getFreeBalanceFor(AssetType.ETH);

  return new InstallCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    app.identity,
    app.terms,
    freeBalance.identity,
    freeBalance.terms,
    freeBalance.hashOfLatestState,
    freeBalance.nonce,
    freeBalance.timeout,
    app.appSeqNo,
    freeBalance.rootNonceValue
  );
}
