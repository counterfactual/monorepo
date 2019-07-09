import {
  coinBalanceRefundStateEncoding,
  NetworkContext
} from "@counterfactual/types";
import { MaxUint256 } from "ethers/constants";
import { defaultAbiCoder } from "ethers/utils";

import {
<<<<<<< HEAD
  ConditionalTransaction,
  SetStateCommitment,
  WithdrawETHCommitment
||||||| merged common ancestors
  InstallCommitment,
  UninstallCommitment,
  WithdrawETHCommitment
=======
  InstallCommitment,
  UninstallCommitment,
  WithdrawCommitment
>>>>>>> Remove ETH from names
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
export const WITHDRAW_ETH_PROTOCOL: ProtocolExecutionFlow = {
  /**
   * Sequence 0 of the WITHDRAW_ETH_PROTOCOL looks a bit like this:
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
      respondingXpub,
      multisigAddress,
      recipient,
      amount
    } = params as WithdrawParams;

    const preInstallRefundAppStateChannel = stateChannelsMap.get(
      multisigAddress
    )!;

<<<<<<< HEAD
    const respondingAddress = preInstallRefundAppStateChannel.getFreeBalanceAddrOf(
      respondingXpub
||||||| merged common ancestors
    const withdrawETHCommitment = addMultisigSendCommitmentToContext(
      context.message,
      context
=======
    const withdrawCommitment = addMultisigSendCommitmentToContext(
      context.message,
      context
>>>>>>> Remove ETH from names
    );

<<<<<<< HEAD
    const postInstallRefundAppStateChannel = addRefundAppToStateChannel(
      preInstallRefundAppStateChannel,
      params as WithdrawParams,
      network
    );

    const refundApp = postInstallRefundAppStateChannel.mostRecentlyInstalledAppInstance();
||||||| merged common ancestors
    const s1 = yield [Opcode.OP_SIGN, installRefundCommitment];
    const s3 = yield [Opcode.OP_SIGN, withdrawETHCommitment];
=======
    const s1 = yield [Opcode.OP_SIGN, installRefundCommitment];
    const s3 = yield [Opcode.OP_SIGN, withdrawCommitment];
>>>>>>> Remove ETH from names

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
        toXpub: respondingXpub,
        signature: mySignatureOnConditionalTransaction,
        seq: 1
      } as ProtocolMessage
    ];

    assertIsValidSignature(
      respondingAddress,
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
      respondingAddress,
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

<<<<<<< HEAD
    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update, // NOTE: The WRITE_COMMITMENT API is awkward in this situation
      signedFreeBalanceStateUpdate,
      postInstallRefundAppStateChannel.freeBalance.identityHash
    ];

    const withdrawETHCommitment = new WithdrawETHCommitment(
      postInstallRefundAppStateChannel.multisigAddress,
      postInstallRefundAppStateChannel.multisigOwners,
      recipient,
      amount
    );

    const mySignatureOnWithdrawalCommitment = yield [
      Opcode.OP_SIGN,
      withdrawETHCommitment
    ];

    const {
      signature: counterpartySignatureOnWithdrawalCommitment,
      signature2: counterpartySignatureOnUninstallCommitment
    } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        protocolExecutionID,
        protocol: Protocol.Withdraw,
        toXpub: respondingXpub,
        signature: mySignatureOnFreeBalanceStateUpdate,
        signature2: mySignatureOnWithdrawalCommitment,
        seq: UNASSIGNED_SEQ_NO
      } as ProtocolMessage
    ];

    assertIsValidSignature(
      respondingAddress,
      withdrawETHCommitment,
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
      respondingAddress,
      uninstallRefundAppCommitment,
      counterpartySignatureOnUninstallCommitment
    );
||||||| merged common ancestors
    validateSignature(respondingAddress, installRefundCommitment, s2);
    validateSignature(respondingAddress, withdrawETHCommitment, s4);
    validateSignature(respondingAddress, uninstallRefundCommitment, s6);
=======
    validateSignature(respondingAddress, installRefundCommitment, s2);
    validateSignature(respondingAddress, withdrawCommitment, s4);
    validateSignature(respondingAddress, uninstallRefundCommitment, s6);
>>>>>>> Remove ETH from names

    const mySignatureOnUninstallCommitment = yield [
      Opcode.OP_SIGN,
      uninstallRefundAppCommitment
    ];

    yield [
      Opcode.IO_SEND,
      {
        protocol: Protocol.Withdraw,
        protocolExecutionID: context.message.protocolExecutionID,
        toXpub: respondingXpub,
        signature: mySignatureOnUninstallCommitment,
        seq: UNASSIGNED_SEQ_NO
      }
    ];

<<<<<<< HEAD
    const signedWithdrawalCommitment = withdrawETHCommitment.getSignedTransaction(
      [
        mySignatureOnWithdrawalCommitment,
        counterpartySignatureOnWithdrawalCommitment
      ]
    );
||||||| merged common ancestors
    const finalCommitment = withdrawETHCommitment.getSignedTransaction([
      s3,
      s4
    ]);
=======
    const finalCommitment = withdrawCommitment.getSignedTransaction([s3, s4]);
>>>>>>> Remove ETH from names

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
   * Sequence 1 of the WITHDRAW_ETH_PROTOCOL looks very similar but the inverse:
   *
   * 1. Countersign the received `ConditionalTransaction` from the initiating
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
      initiatingXpub,
      multisigAddress,
      recipient,
      amount
    } = params as WithdrawParams;

    const preInstallRefundAppStateChannel = stateChannelsMap.get(
      multisigAddress
    )!;

    const initiatingAddress = preInstallRefundAppStateChannel.getFreeBalanceAddrOf(
      initiatingXpub
    );

<<<<<<< HEAD
    const postInstallRefundAppStateChannel = addRefundAppToStateChannel(
      preInstallRefundAppStateChannel,
      params as WithdrawParams,
      network
||||||| merged common ancestors
    const withdrawETHCommitment = addMultisigSendCommitmentToContext(
      context.message,
      context
=======
    const withdrawCommitment = addMultisigSendCommitmentToContext(
      context.message,
      context
>>>>>>> Remove ETH from names
    );

    const refundApp = postInstallRefundAppStateChannel.mostRecentlyInstalledAppInstance();

    const conditionalTransactionData = constructConditionalTransactionForRefundApp(
      network,
      postInstallRefundAppStateChannel
    );

    assertIsValidSignature(
      initiatingAddress,
      conditionalTransactionData,
      counterpartySignatureOnConditionalTransaction
    );

    const mySignatureOnConditionalTransaction = yield [
      Opcode.OP_SIGN,
      conditionalTransactionData
    ];

<<<<<<< HEAD
    const signedConditionalTransaction = conditionalTransactionData.getSignedTransaction(
      [
        mySignatureOnConditionalTransaction,
        counterpartySignatureOnConditionalTransaction
      ]
    );
||||||| merged common ancestors
    validateSignature(initiatingAddress, withdrawETHCommitment, s3);
=======
    validateSignature(initiatingAddress, withdrawCommitment, s3);
>>>>>>> Remove ETH from names

<<<<<<< HEAD
    context.stateChannelsMap.set(
      postInstallRefundAppStateChannel.multisigAddress,
      postInstallRefundAppStateChannel
    );
||||||| merged common ancestors
    const s2 = yield [Opcode.OP_SIGN, installRefundCommitment];
    const s4 = yield [Opcode.OP_SIGN, withdrawETHCommitment];
    const s6 = yield [Opcode.OP_SIGN, uninstallRefundCommitment];
=======
    const s2 = yield [Opcode.OP_SIGN, installRefundCommitment];
    const s4 = yield [Opcode.OP_SIGN, withdrawCommitment];
    const s6 = yield [Opcode.OP_SIGN, uninstallRefundCommitment];
>>>>>>> Remove ETH from names

<<<<<<< HEAD
||||||| merged common ancestors
    const finalCommitment = withdrawETHCommitment.getSignedTransaction([
      s3,
      s4
    ]);
=======
    const finalCommitment = withdrawCommitment.getSignedTransaction([s3, s4]);
>>>>>>> Remove ETH from names
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
        toXpub: initiatingXpub,
        signature: mySignatureOnConditionalTransaction,
        signature2: mySignatureOnFreeBalanceStateUpdate,
        seq: UNASSIGNED_SEQ_NO
      } as ProtocolMessage
    ];

    assertIsValidSignature(
      initiatingAddress,
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

    const withdrawETHCommitment = new WithdrawETHCommitment(
      postInstallRefundAppStateChannel.multisigAddress,
      postInstallRefundAppStateChannel.multisigOwners,
      recipient,
      amount
    );

    assertIsValidSignature(
      initiatingAddress,
      withdrawETHCommitment,
      counterpartySignatureOnWithdrawalCommitment
    );

    const mySignatureOnWithdrawalCommitment = yield [
      Opcode.OP_SIGN,
      withdrawETHCommitment
    ];

    const signedWithdrawalCommitment = withdrawETHCommitment.getSignedTransaction(
      [
        mySignatureOnWithdrawalCommitment,
        counterpartySignatureOnWithdrawalCommitment
      ]
    );

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
        toXpub: initiatingXpub,
        signature: mySignatureOnWithdrawalCommitment,
        signature2: mySignatureOnUninstallCommitment,
        seq: UNASSIGNED_SEQ_NO
      } as ProtocolMessage
    ];

    assertIsValidSignature(
      initiatingAddress,
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

<<<<<<< HEAD
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
  const { recipient, amount, multisigAddress, initiatingXpub } = params;
||||||| merged common ancestors
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
=======
function addInstallRefundAppCommitmentToContext(
  params: ProtocolParameters,
  context: Context
): [InstallCommitment, string] {
  const {
    recipient,
    amount,
    multisigAddress,
    initiatingXpub,
    tokenAddress
  } = params as WithdrawParams;
>>>>>>> Wire up token address to install and uninstall app functions

  const defaultTimeout = 1008;

  // TODO: Use a wrapper function for making new AppInstance objects.
  const refundAppInstance = new AppInstance(
    multisigAddress,
    stateChannel.getNextSigningKeys(),
    defaultTimeout,
    {
<<<<<<< HEAD
      addr: network.CoinBalanceRefundApp,
      stateEncoding: `
        tuple(
          address recipient,
          address multisig,
          uint256 threshold
        )
      `,
||||||| merged common ancestors
      addr: context.network.CoinBalanceRefundApp,
      stateEncoding:
        "tuple(address recipient, address multisig,  uint256 threshold)",
=======
      addr: context.network.CoinBalanceRefundApp,
      stateEncoding: coinBalanceRefundStateEncoding,
>>>>>>> Wire up token address to install and uninstall app functions
      actionEncoding: undefined
    },
    false,
    stateChannel.numInstalledApps,
    {
      recipient,
      multisig: multisigAddress,
      threshold: amount,
      token: tokenAddress
    },
    0,
    defaultTimeout,
    undefined,
    { limit: MaxUint256, tokenAddress: CONVENTION_FOR_ETH_TOKEN_ADDRESS },
    CONVENTION_FOR_ETH_TOKEN_ADDRESS
  );

<<<<<<< HEAD
  return stateChannel.installApp(refundAppInstance, {
    [stateChannel.getFreeBalanceAddrOf(initiatingXpub)]: amount
  });
||||||| merged common ancestors
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
=======
  const newStateChannel = stateChannel.installApp(
    refundAppInstance,
    {
      [stateChannel.getFreeBalanceAddrOf(initiatingXpub)]: amount
    },
    tokenAddress
  );

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
>>>>>>> Wire up token address to install and uninstall app functions
}

<<<<<<< HEAD
/**
 * Computes the ConditionalTransaction unsigned transaction pertaining to the
 * installation of the ETHBalanceRefundApp.
 *
 * Note that this app is hard-coded to the CoinTransferETHInterpreter. You can see this
 * by reviewing the `ETHBalanceRefundApp.sol` file which has an outcome structure
 * of LibOutcome.CoinTrasfer[].
 *
 * @param {NetworkContext} network - Metadata on the current blockchain
 * @param {StateChannel} stateChannel - The post-refund-app-installed StateChannel
 *
 * @returns {ConditionalTransaction} A ConditionalTransaction object, ready to sign.
 */
function constructConditionalTransactionForRefundApp(
||||||| merged common ancestors
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

  return new WithdrawCommitment(
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    recipient,
    amount
  );
}

function constructInstallOp(
=======
function addUninstallRefundAppCommitmentToContext(
  message: ProtocolMessage,
  context: Context,
  appIdentityHash: string
): UninstallCommitment {
  const { multisigAddress, tokenAddress } = message.params as WithdrawParams;

  const stateChannel = context.stateChannelsMap.get(multisigAddress)!;

  const newStateChannel = stateChannel.uninstallApp(
    appIdentityHash,
    {},
    tokenAddress
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
>>>>>>> Wire up token address to install and uninstall app functions
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
    network.CoinTransferETHInterpreter,
    defaultAbiCoder.encode(
      ["tuple(uint256 limit, address tokenAddress)"],
      [appInstance.coinTransferInterpreterParams]
    )
  );
}
