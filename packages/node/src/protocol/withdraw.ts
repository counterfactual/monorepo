import {
  coinBalanceRefundStateEncoding,
  NetworkContext,
  OutcomeType,
  singleAssetTwoPartyCoinTransferInterpreterParamsEncoding
} from "@counterfactual/types";
import { MaxUint256 } from "ethers/constants";
import { BigNumber, defaultAbiCoder } from "ethers/utils";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../constants";
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

import { UNASSIGNED_SEQ_NO } from "./utils/signature-forwarder";
import { assertIsValidSignature } from "./utils/signature-validator";

const { IO_SEND, IO_SEND_AND_WAIT, OP_SIGN, WRITE_COMMITMENT } = Opcode;
const { Install, Update, Withdraw } = Protocol;
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
      store,
      message: { params, processID },
      network
    } = context;

    const {
      sharedData: { stateChannelsMap }
    } = store;

    const {
      responderXpub,
      multisigAddress,
      recipient,
      amount,
      tokenAddress
    } = params as WithdrawParams;

    const preInstallRefundAppStateChannel = StateChannel.fromJson(
      stateChannelsMap[multisigAddress]
    );

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
      OP_SIGN,
      conditionalTransactionData
    ];

    const {
      customData: {
        signature: counterpartySignatureOnConditionalTransaction,
        signature2: counterpartySignatureOnFreeBalanceStateUpdate
      }
    } = yield [
      IO_SEND_AND_WAIT,
      {
        processID,
        params,
        protocol: Withdraw,
        toXpub: responderXpub,
        customData: {
          signature: mySignatureOnConditionalTransaction
        },
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

    yield [
      WRITE_COMMITMENT,
      Install, // NOTE: The WRITE_COMMITMENT API is awkward in this situation
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
      OP_SIGN,
      freeBalanceUpdateData
    ];

    const signedFreeBalanceStateUpdate = freeBalanceUpdateData.getSignedTransaction(
      [
        mySignatureOnFreeBalanceStateUpdate,
        counterpartySignatureOnFreeBalanceStateUpdate
      ]
    );

    yield [
      WRITE_COMMITMENT,
      Update, // NOTE: The WRITE_COMMITMENT API is awkward in this situation
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
      OP_SIGN,
      withdrawCommitment
    ];

    const {
      customData: {
        signature: counterpartySignatureOnWithdrawalCommitment,
        signature2: counterpartySignatureOnUninstallCommitment
      }
    } = yield [
      IO_SEND_AND_WAIT,
      {
        processID,
        protocol: Withdraw,
        toXpub: responderXpub,
        customData: {
          signature: mySignatureOnFreeBalanceStateUpdate,
          signature2: mySignatureOnWithdrawalCommitment
        },
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

    await store.saveStateChannel(postUninstallRefundAppStateChannel);

    const mySignatureOnUninstallCommitment = yield [
      OP_SIGN,
      uninstallRefundAppCommitment
    ];

    yield <[Opcode, ProtocolMessage]>[
      IO_SEND_AND_WAIT,
      {
        protocol: Withdraw,
        processID: context.message.processID,
        toXpub: responderXpub,
        customData: {
          signature: mySignatureOnUninstallCommitment
        },
        seq: UNASSIGNED_SEQ_NO
      }
    ];

    const signedWithdrawalCommitment = withdrawCommitment.getSignedTransaction([
      mySignatureOnWithdrawalCommitment,
      counterpartySignatureOnWithdrawalCommitment
    ]);

    yield [
      WRITE_COMMITMENT,
      Withdraw,
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
      WRITE_COMMITMENT,
      Update, // NOTE: The WRITE_COMMITMENT API is awkward in this situation
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
      store,
      message: { params, processID, customData },
      network
    } = context;

    const {
      sharedData: { stateChannelsMap }
    } = store;

    // Aliasing `signature` to this variable name for code clarity
    const counterpartySignatureOnConditionalTransaction = customData.signature;

    const {
      initiatorXpub,
      multisigAddress,
      recipient,
      amount,
      tokenAddress
    } = params as WithdrawParams;

    const preInstallRefundAppStateChannel = StateChannel.fromJson(
      stateChannelsMap[multisigAddress]
    );

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
      OP_SIGN,
      conditionalTransactionData
    ];

    const signedConditionalTransaction = conditionalTransactionData.getSignedTransaction(
      [
        mySignatureOnConditionalTransaction,
        counterpartySignatureOnConditionalTransaction
      ]
    );

    yield [
      WRITE_COMMITMENT,
      Install, // NOTE: The WRITE_COMMITMENT API is awkward in this situation
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
      OP_SIGN,
      freeBalanceUpdateData
    ];

    const {
      customData: {
        signature: counterpartySignatureOnFreeBalanceStateUpdate,
        signature2: counterpartySignatureOnWithdrawalCommitment
      }
    } = yield [
      IO_SEND_AND_WAIT,
      {
        processID,
        protocol: Withdraw,
        toXpub: initiatorXpub,
        customData: {
          signature: mySignatureOnConditionalTransaction,
          signature2: mySignatureOnFreeBalanceStateUpdate
        },
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
      WRITE_COMMITMENT,
      Update, // NOTE: The WRITE_COMMITMENT API is awkward in this situation
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
      OP_SIGN,
      withdrawCommitment
    ];

    const signedWithdrawalCommitment = withdrawCommitment.getSignedTransaction([
      mySignatureOnWithdrawalCommitment,
      counterpartySignatureOnWithdrawalCommitment
    ]);

    yield [
      WRITE_COMMITMENT,
      Withdraw,
      signedWithdrawalCommitment,
      multisigAddress
    ];

    const postUninstallRefundAppStateChannel = postInstallRefundAppStateChannel.uninstallApp(
      refundApp.identityHash,
      {}
    );

    const uninstallRefundAppCommitment = new SetStateCommitment(
      network,
      postUninstallRefundAppStateChannel.freeBalance.identity,
      postUninstallRefundAppStateChannel.freeBalance.hashOfLatestState,
      postUninstallRefundAppStateChannel.freeBalance.versionNumber,
      postUninstallRefundAppStateChannel.freeBalance.timeout
    );

    const mySignatureOnUninstallCommitment = yield [
      OP_SIGN,
      uninstallRefundAppCommitment
    ];

    const {
      customData: { signature: counterpartySignatureOnUninstallCommitment }
    } = yield [
      IO_SEND_AND_WAIT,
      {
        processID,
        protocol: Withdraw,
        toXpub: initiatorXpub,
        customData: {
          signature: mySignatureOnWithdrawalCommitment,
          signature2: mySignatureOnUninstallCommitment
        },
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
      WRITE_COMMITMENT,
      Update, // NOTE: The WRITE_COMMITMENT API is awkward in this situation
      signedUninstallCommitment,
      postUninstallRefundAppStateChannel.freeBalance.identityHash
    ];

    yield [
      IO_SEND,
      {
        processID,
        protocol: Withdraw,
        toXpub: initiatorXpub,
        customData: {
          dataPersisted: true
        },
        seq: UNASSIGNED_SEQ_NO
      } as ProtocolMessage
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
    stateChannel.getNextSigningKeys(),
    defaultTimeout,
    {
      addr: network.CoinBalanceRefundApp,
      stateEncoding: coinBalanceRefundStateEncoding,
      actionEncoding: undefined
    },
    false,
    stateChannel.numProposedApps,
    {
      recipient,
      multisig: multisigAddress,
      threshold: amount
    },
    0,
    defaultTimeout,
    OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER,
    undefined,
    undefined,
    { tokenAddress, limit: MaxUint256.toHexString() }
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
 * Note that this app is hard-coded to the MultiAssetMultiPartyCoinTransferInterpreter. You can see this
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
    network.SingleAssetTwoPartyCoinTransferInterpreter,
    defaultAbiCoder.encode(
      [singleAssetTwoPartyCoinTransferInterpreterParamsEncoding],
      [appInstance.singleAssetTwoPartyCoinTransferInterpreterParams]
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
