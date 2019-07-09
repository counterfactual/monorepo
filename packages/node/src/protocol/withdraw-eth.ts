import { NetworkContext } from "@counterfactual/types";
import { MaxUint256 } from "ethers/constants";
import { defaultAbiCoder } from "ethers/utils";

import {
  InstallCommitment,
  UninstallCommitment,
  WithdrawETHCommitment
} from "../ethereum";
import { ProtocolExecutionFlow } from "../machine";
import { Opcode, Protocol } from "../machine/enums";
import {
  Context,
  ProtocolMessage,
  ProtocolParameters,
  WithdrawParams
} from "../machine/types";
import { xkeyKthAddress } from "../machine/xkeys";
import { AppInstance, StateChannel } from "../models";
import {
  CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  FreeBalanceState
} from "../models/free-balance";

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
        protocol: Protocol.Withdraw,
        protocolExecutionID: context.message.protocolExecutionID,
        params: context.message.params,
        toXpub: respondingXpub,
        signature: s1,
        signature2: s3,
        seq: 1
      } as ProtocolMessage
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
        protocol: Protocol.Withdraw,
        protocolExecutionID: context.message.protocolExecutionID,
        toXpub: respondingXpub,
        signature: s5,
        seq: -1
      }
    ];

    const finalCommitment = withdrawETHCommitment.getSignedTransaction([
      s3,
      s4
    ]);

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

    const finalCommitment = withdrawETHCommitment.getSignedTransaction([
      s3,
      s4
    ]);
    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Withdraw,
      finalCommitment,
      multisigAddress
    ];

    const m3 = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        protocol: Protocol.Withdraw,
        protocolExecutionID: context.message.protocolExecutionID,
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

  const refundAppInstance = new AppInstance(
    multisigAddress,
    stateChannel.getNextSigningKeys(),
    1008,
    {
      addr: context.network.CoinBalanceRefundApp,
      stateEncoding:
        "tuple(address recipient, address multisig,  uint256 threshold)",
      actionEncoding: undefined
    },
    false,
    stateChannel.numInstalledApps,
    {
      recipient,
      multisig: multisigAddress,
      threshold: amount
    },
    0,
    1008,
    undefined,
    { limit: MaxUint256 }
  );

  const newStateChannel = stateChannel.installApp(refundAppInstance, {
    [stateChannel.getFreeBalanceAddrOf(initiatingXpub)]: amount
  });

  context.stateChannelsMap.set(
    newStateChannel.multisigAddress,
    newStateChannel
  );

  const installRefundCommitment = constructInstallOp(
    context.network,
    newStateChannel,
    refundAppInstance.identityHash
  );

  return [installRefundCommitment, refundAppInstance.identityHash];
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
    {},
    CONVENTION_FOR_ETH_TOKEN_ADDRESS
  );
  context.stateChannelsMap.set(
    newStateChannel.multisigAddress,
    newStateChannel
  );

  const freeBalance = stateChannel.freeBalance;

  const uninstallCommitment = new UninstallCommitment(
    context.network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    freeBalance.identity,
    (freeBalance.state as unknown) as FreeBalanceState,
    freeBalance.versionNumber,
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

  const freeBalance = stateChannel.freeBalance;

  return new InstallCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    app.identity,
    freeBalance.identity,
    freeBalance.hashOfLatestState,
    freeBalance.versionNumber,
    freeBalance.timeout,
    app.appSeqNo,
    network.ETHInterpreter,
    defaultAbiCoder.encode(["uint256"], [MaxUint256])
  );
}
