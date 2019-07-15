import {
  coinBalanceRefundStateEncoding,
  coinTransferInterpreterParamsStateEncoding,
  NetworkContext
} from "@counterfactual/types";
import { MaxUint256 } from "ethers/constants";
import { BigNumber, defaultAbiCoder } from "ethers/utils";

import {
  ConditionalTransaction,
  SetStateCommitment,
  WithdrawERC20Commitment,
  WithdrawETHCommitment
} from "../ethereum";
import { ProtocolExecutionFlow } from "../machine";
import { Opcode, Protocol } from "../machine/enums";
import { Context, ProtocolMessage, WithdrawParams } from "../machine/types";
import { AppInstance, StateChannel } from "../models";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../models/free-balance";

import { UNASSIGNED_SEQ_NO } from "./utils/signature-forwarder";
import { assertIsValidSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 * https://specs.counterfactual.com/11-withdraw-protocol *
 */
export const WITHDRAW_PROTOCOL: ProtocolExecutionFlow = {
  /**
   * Sequence 0 of the WITHDRAW_PROTOCOL looks a bit like this:
   *
   * 1. Sign a `ConditionalTransaction` for an ETHBalanceRefund AppInstance
   * 2. Get the countersignature, then sign the FreeBalance state update to activate
   * 3. Sign the WithdrawETHCommitment and wait for counterparty
   * 4. Countersign the uninstallation FreeBalance state update
   *
   * Effectively you are installing an ETHBalanceRefund such that all funds above
   * some value in the multisignature wallet belong to you, then signing the actual
   * withdrawal transaction from the multisignature wallet, then uninstalling the
   * ETHBalanceRefund which is worthless after this point since signing the withdrawal
   * transaction on the multisignature wallet is equivalent to spending the money.
   *
   * @param {Context} context - Persistent object for duration of the protocol
   *        that includes lots of information about the current state of the user's
   *        channel, the parameters being passed in, and any messages received.
   */

  0 /* Initiating */: async function*(context: Context) {
    const {
      stateChannelsMap,
      message: { params, protocolExecutionID },
      network
    } = context;

    const {
      responderXpub,
      multisigAddress,
      recipient,
      amount,
      tokenAddress
    } = params as WithdrawParams;

    const preInstallRefundAppStateChannel = stateChannelsMap.get(
      multisigAddress
    )!;

    const responderAddress = preInstallRefundAppStateChannel.getFreeBalanceAddrOf(
      responderXpub
    );

    const postInstallRefundAppStateChannel = addRefundAppToStateChannel(
      preInstallRefundAppStateChannel,
      params as WithdrawParams,
      network
    );

    const refundApp = postInstallRefundAppStateChannel.mostRecentlyInstalledAppInstance();

    const conditionalTransactionData = constructConditionalTransactionForRefundApp(
      network,
      postInstallRefundAppStateChannel
    );

    const mySignatureOnConditionalTransaction = yield [
      Opcode.OP_SIGN,
      conditionalTransactionData
    ];

    const {
      signature: counterpartySignatureOnConditionalTransaction,
      signature2: counterpartySignatureOnFreeBalanceStateUpdate
    } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        protocolExecutionID,
        params,
        protocol: Protocol.Withdraw,
        toXpub: responderXpub,
        signature: mySignatureOnConditionalTransaction,
        seq: 1
      } as ProtocolMessage
    ];

    assertIsValidSignature(
      responderAddress,
      conditionalTransactionData,
      counterpartySignatureOnConditionalTransaction
    );

    const signedConditionalTransaction = conditionalTransactionData.getSignedTransaction(
      [
        mySignatureOnConditionalTransaction,
        counterpartySignatureOnConditionalTransaction
      ]
    );

    context.stateChannelsMap.set(
      postInstallRefundAppStateChannel.multisigAddress,
      postInstallRefundAppStateChannel
    );

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Install, // NOTE: The WRITE_COMMITMENT API is awkward in this situation
      signedConditionalTransaction,
      refundApp.identityHash
    ];

    const freeBalanceUpdateData = new SetStateCommitment(
      network,
      postInstallRefundAppStateChannel.freeBalance.identity,
      postInstallRefundAppStateChannel.freeBalance.hashOfLatestState,
      postInstallRefundAppStateChannel.freeBalance.versionNumber,
      postInstallRefundAppStateChannel.freeBalance.timeout
    );

    assertIsValidSignature(
      responderAddress,
      freeBalanceUpdateData,
      counterpartySignatureOnFreeBalanceStateUpdate
    );

    const mySignatureOnFreeBalanceStateUpdate = yield [
      Opcode.OP_SIGN,
      freeBalanceUpdateData
    ];

    const signedFreeBalanceStateUpdate = freeBalanceUpdateData.getSignedTransaction(
      [
        mySignatureOnFreeBalanceStateUpdate,
        counterpartySignatureOnFreeBalanceStateUpdate
      ]
    );

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update, // NOTE: The WRITE_COMMITMENT API is awkward in this situation
      signedFreeBalanceStateUpdate,
      postInstallRefundAppStateChannel.freeBalance.identityHash
    ];

    const withdrawCommitment = constructWithdrawalCommitment(
      postInstallRefundAppStateChannel,
      recipient,
      amount,
      tokenAddress
    );

    const mySignatureOnWithdrawalCommitment = yield [
      Opcode.OP_SIGN,
      withdrawCommitment
    ];

    const {
      signature: counterpartySignatureOnWithdrawalCommitment,
      signature2: counterpartySignatureOnUninstallCommitment
    } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        protocolExecutionID,
        protocol: Protocol.Withdraw,
        toXpub: responderXpub,
        signature: mySignatureOnFreeBalanceStateUpdate,
        signature2: mySignatureOnWithdrawalCommitment,
        seq: UNASSIGNED_SEQ_NO
      } as ProtocolMessage
    ];

    assertIsValidSignature(
      responderAddress,
      withdrawCommitment,
      counterpartySignatureOnWithdrawalCommitment
    );

    const postUninstallRefundAppStateChannel = postInstallRefundAppStateChannel.uninstallApp(
      refundApp.identityHash,
      {}
    );

    context.stateChannelsMap.set(
      postUninstallRefundAppStateChannel.multisigAddress,
      postUninstallRefundAppStateChannel
    );

    const uninstallRefundAppCommitment = new SetStateCommitment(
      network,
      postUninstallRefundAppStateChannel.freeBalance.identity,
      postUninstallRefundAppStateChannel.freeBalance.hashOfLatestState,
      postUninstallRefundAppStateChannel.freeBalance.versionNumber,
      postUninstallRefundAppStateChannel.freeBalance.timeout
    );

    assertIsValidSignature(
      responderAddress,
      uninstallRefundAppCommitment,
      counterpartySignatureOnUninstallCommitment
    );

    const mySignatureOnUninstallCommitment = yield [
      Opcode.OP_SIGN,
      uninstallRefundAppCommitment
    ];

    yield [
      Opcode.IO_SEND,
      {
        protocol: Protocol.Withdraw,
        protocolExecutionID: context.message.protocolExecutionID,
        toXpub: responderXpub,
        signature: mySignatureOnUninstallCommitment,
        seq: UNASSIGNED_SEQ_NO
      }
    ];

    const signedWithdrawalCommitment = withdrawCommitment.getSignedTransaction([
      mySignatureOnWithdrawalCommitment,
      counterpartySignatureOnWithdrawalCommitment
    ]);

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Withdraw,
      signedWithdrawalCommitment,
      multisigAddress
    ];

    const signedUninstallCommitment = uninstallRefundAppCommitment.getSignedTransaction(
      [
        mySignatureOnUninstallCommitment,
        counterpartySignatureOnUninstallCommitment
      ]
    );

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update, // NOTE: The WRITE_COMMITMENT API is awkward in this situation
      signedUninstallCommitment,
      postUninstallRefundAppStateChannel.freeBalance.identityHash
    ];
  },

  /**
   * Sequence 1 of the WITHDRAW_PROTOCOL looks very similar but the inverse:
   *
   * 1. Countersign the received `ConditionalTransaction` from the initiator
   * 2. Sign the free balance state update to install the AppInstance and send
   * 3. Countersign the WithdrawETHCommitment you receive back
   * 4. Sign and send the FreeBalance state update and wait for the countersignature
   *
   * @param {Context} context - Persistent object for duration of the protocol
   *        that includes lots of information about the current state of the user's
   *        channel, the parameters being passed in, and any messages received.
   */

  1 /* Responding */: async function*(context: Context) {
    const {
      stateChannelsMap,
      message: { params, protocolExecutionID, signature },
      network
    } = context;

    // Aliasing `signature` to this variable name for code clarity
    const counterpartySignatureOnConditionalTransaction = signature;

    const {
      initiatorXpub,
      multisigAddress,
      recipient,
      amount,
      tokenAddress
    } = params as WithdrawParams;

    const preInstallRefundAppStateChannel = stateChannelsMap.get(
      multisigAddress
    )!;

    const initiatorAddress = preInstallRefundAppStateChannel.getFreeBalanceAddrOf(
      initiatorXpub
    );

    const postInstallRefundAppStateChannel = addRefundAppToStateChannel(
      preInstallRefundAppStateChannel,
      params as WithdrawParams,
      network
    );

    const refundApp = postInstallRefundAppStateChannel.mostRecentlyInstalledAppInstance();

    const conditionalTransactionData = constructConditionalTransactionForRefundApp(
      network,
      postInstallRefundAppStateChannel
    );

    assertIsValidSignature(
      initiatorAddress,
      conditionalTransactionData,
      counterpartySignatureOnConditionalTransaction
    );

    const mySignatureOnConditionalTransaction = yield [
      Opcode.OP_SIGN,
      conditionalTransactionData
    ];

    const signedConditionalTransaction = conditionalTransactionData.getSignedTransaction(
      [
        mySignatureOnConditionalTransaction,
        counterpartySignatureOnConditionalTransaction
      ]
    );

    context.stateChannelsMap.set(
      postInstallRefundAppStateChannel.multisigAddress,
      postInstallRefundAppStateChannel
    );

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Install, // NOTE: The WRITE_COMMITMENT API is awkward in this situation
      signedConditionalTransaction,
      refundApp.identityHash
    ];

    const freeBalanceUpdateData = new SetStateCommitment(
      network,
      postInstallRefundAppStateChannel.freeBalance.identity,
      postInstallRefundAppStateChannel.freeBalance.hashOfLatestState,
      postInstallRefundAppStateChannel.freeBalance.versionNumber,
      postInstallRefundAppStateChannel.freeBalance.timeout
    );

    const mySignatureOnFreeBalanceStateUpdate = yield [
      Opcode.OP_SIGN,
      freeBalanceUpdateData
    ];

    const {
      signature: counterpartySignatureOnFreeBalanceStateUpdate,
      signature2: counterpartySignatureOnWithdrawalCommitment
    } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        protocolExecutionID,
        protocol: Protocol.Withdraw,
        toXpub: initiatorXpub,
        signature: mySignatureOnConditionalTransaction,
        signature2: mySignatureOnFreeBalanceStateUpdate,
        seq: UNASSIGNED_SEQ_NO
      } as ProtocolMessage
    ];

    assertIsValidSignature(
      initiatorAddress,
      freeBalanceUpdateData,
      counterpartySignatureOnFreeBalanceStateUpdate
    );

    const signedFreeBalanceStateUpdate = freeBalanceUpdateData.getSignedTransaction(
      [
        mySignatureOnFreeBalanceStateUpdate,
        counterpartySignatureOnFreeBalanceStateUpdate
      ]
    );

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update, // NOTE: The WRITE_COMMITMENT API is awkward in this situation
      signedFreeBalanceStateUpdate,
      postInstallRefundAppStateChannel.freeBalance.identityHash
    ];

    const withdrawCommitment = constructWithdrawalCommitment(
      postInstallRefundAppStateChannel,
      recipient,
      amount,
      tokenAddress
    );

    assertIsValidSignature(
      initiatorAddress,
      withdrawCommitment,
      counterpartySignatureOnWithdrawalCommitment
    );

    const mySignatureOnWithdrawalCommitment = yield [
      Opcode.OP_SIGN,
      withdrawCommitment
    ];

    const signedWithdrawalCommitment = withdrawCommitment.getSignedTransaction([
      mySignatureOnWithdrawalCommitment,
      counterpartySignatureOnWithdrawalCommitment
    ]);

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Withdraw,
      signedWithdrawalCommitment,
      multisigAddress
    ];

    const postUninstallRefundAppStateChannel = postInstallRefundAppStateChannel.uninstallApp(
      refundApp.identityHash,
      {}
    );

    context.stateChannelsMap.set(
      postUninstallRefundAppStateChannel.multisigAddress,
      postUninstallRefundAppStateChannel
    );

    const uninstallRefundAppCommitment = new SetStateCommitment(
      network,
      postUninstallRefundAppStateChannel.freeBalance.identity,
      postUninstallRefundAppStateChannel.freeBalance.hashOfLatestState,
      postUninstallRefundAppStateChannel.freeBalance.versionNumber,
      postUninstallRefundAppStateChannel.freeBalance.timeout
    );

    const mySignatureOnUninstallCommitment = yield [
      Opcode.OP_SIGN,
      uninstallRefundAppCommitment
    ];

    const { signature: counterpartySignatureOnUninstallCommitment } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        protocolExecutionID,
        protocol: Protocol.Withdraw,
        toXpub: initiatorXpub,
        signature: mySignatureOnWithdrawalCommitment,
        signature2: mySignatureOnUninstallCommitment,
        seq: UNASSIGNED_SEQ_NO
      } as ProtocolMessage
    ];

    assertIsValidSignature(
      initiatorAddress,
      uninstallRefundAppCommitment,
      counterpartySignatureOnUninstallCommitment
    );

    const signedUninstallCommitment = uninstallRefundAppCommitment.getSignedTransaction(
      [
        mySignatureOnUninstallCommitment,
        counterpartySignatureOnUninstallCommitment
      ]
    );

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update, // NOTE: The WRITE_COMMITMENT API is awkward in this situation
      signedUninstallCommitment,
      postUninstallRefundAppStateChannel.freeBalance.identityHash
    ];
  }
};

/**
 * Adds an ETHBalanceRefundApp to the StateChannel object passed in based on
 * parameters also passed in with recipient and amount information.
 *
 * @param {StateChannel} stateChannel - the pre-install-refund-app StateChannel
 * @param {WithdrawParams} params - params with recipient and amount
 * @param {NetworkContext} network - metadata on the addresses on the chain
 *
 * @returns {StateChannel} - the same StateChannel with an ETHBalanceRefundApp added
 */
function addRefundAppToStateChannel(
  stateChannel: StateChannel,
  params: WithdrawParams,
  network: NetworkContext
): StateChannel {
  const {
    recipient,
    amount,
    multisigAddress,
    initiatorXpub,
    tokenAddress
  } = params;

  const defaultTimeout = 1008;

  // TODO: Use a wrapper function for making new AppInstance objects.
  const refundAppInstance = new AppInstance(
    multisigAddress,
    stateChannel.getNextSigningKeys(),
    defaultTimeout,
    {
      addr: network.CoinBalanceRefundApp,
      stateEncoding: coinBalanceRefundStateEncoding,
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
    defaultTimeout,
    undefined,
    { tokens: [tokenAddress], limit: [MaxUint256] }
  );

  return stateChannel.installApp(refundAppInstance, {
    [tokenAddress]: {
      [stateChannel.getFreeBalanceAddrOf(initiatorXpub)]: amount
    }
  });
}

/**
 * Computes the ConditionalTransaction unsigned transaction pertaining to the
 * installation of the ETHBalanceRefundApp.
 *
 * Note that this app is hard-coded to the CoinTransferInterpreter. You can see this
 * by reviewing the `ETHBalanceRefundApp.sol` file which has an outcome structure
 * of LibOutcome.CoinTrasfer[].
 *
 * @param {NetworkContext} network - Metadata on the current blockchain
 * @param {StateChannel} stateChannel - The post-refund-app-installed StateChannel
 *
 * @returns {ConditionalTransaction} A ConditionalTransaction object, ready to sign.
 */
function constructConditionalTransactionForRefundApp(
  network: NetworkContext,
  stateChannel: StateChannel
): ConditionalTransaction {
  const appInstance = stateChannel.mostRecentlyInstalledAppInstance();

  return new ConditionalTransaction(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    appInstance.identityHash,
    stateChannel.freeBalance.identityHash,
    network.CoinTransferInterpreter,
    defaultAbiCoder.encode(
      [coinTransferInterpreterParamsStateEncoding],
      [appInstance.coinTransferInterpreterParams]
    )
  );
}

function constructWithdrawalCommitment(
  postInstallRefundAppStateChannel: StateChannel,
  recipient: string,
  amount: BigNumber,
  tokenAddress: string
) {
  if (tokenAddress === CONVENTION_FOR_ETH_TOKEN_ADDRESS) {
    return new WithdrawETHCommitment(
      postInstallRefundAppStateChannel.multisigAddress,
      postInstallRefundAppStateChannel.multisigOwners,
      recipient,
      amount
    );
  }
  return new WithdrawERC20Commitment(
    postInstallRefundAppStateChannel.multisigAddress,
    postInstallRefundAppStateChannel.multisigOwners,
    recipient,
    amount,
    tokenAddress
  );
}
