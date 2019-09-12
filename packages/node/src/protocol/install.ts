import {
  MultiAssetMultiPartyCoinTransferInterpreterParams,
  NetworkContext,
  OutcomeType,
  SingleAssetTwoPartyCoinTransferInterpreterParams,
  TwoPartyFixedOutcomeInterpreterParams
} from "@counterfactual/types";
import { MaxUint256 } from "ethers/constants";
import { BigNumber } from "ethers/utils";

import { SetStateCommitment } from "../ethereum";
import { ConditionalTransaction } from "../ethereum/conditional-transaction-commitment";
import { ProtocolExecutionFlow } from "../machine";
import { Opcode, Protocol } from "../machine/enums";
import { Context, InstallParams, ProtocolMessage } from "../machine/types";
import { TWO_PARTY_OUTCOME_DIFFERENT_ASSETS } from "../methods/errors";
import { AppInstance, StateChannel } from "../models";
import { TokenIndexedCoinTransferMap } from "../models/free-balance";

import { UNASSIGNED_SEQ_NO } from "./utils/signature-forwarder";
import { assertIsValidSignature } from "./utils/signature-validator";

const {
  OP_SIGN,
  IO_SEND,
  IO_SEND_AND_WAIT,
  PERSIST_STATE_CHANNEL,
  WRITE_COMMITMENT
} = Opcode;
const { Update, Install } = Protocol;

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/05-install-protocol#messages
 */
export const INSTALL_PROTOCOL: ProtocolExecutionFlow = {
  /**
   * Sequence 0 of the INSTALL_PROTOCOL requires the initiator party
   * to sign the ConditionalTransactionCommitment for the as-yet un-funded
   * newly proposed AppInstance, wait for a countersignature, and then when
   * received countersign the _also received_ free balance state update to
   * activate / fund the new app, and send the signature to that back to the
   * counterparty to finish the protocol.
   *
   * @param {Context} context
   */

  0 /* Initiating */: async function*(context: Context) {
    const {
      stateChannelsMap,
      message: { params, processID },
      network
    } = context;

    const { responderXpub, multisigAddress } = params as InstallParams;

    const preProtocolStateChannel = stateChannelsMap.get(multisigAddress)!;

    const postProtocolStateChannel = computeStateChannelTransition(
      preProtocolStateChannel,
      params as InstallParams
    );

    const newAppInstance = postProtocolStateChannel.mostRecentlyInstalledAppInstance();

    const conditionalTransactionData = constructConditionalTransactionData(
      network,
      postProtocolStateChannel
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
        protocol: Install,
        toXpub: responderXpub,
        customData: {
          signature: mySignatureOnConditionalTransaction
        },
        seq: 1
      } as ProtocolMessage
    ];

    assertIsValidSignature(
      preProtocolStateChannel.getFreeBalanceAddrOf(responderXpub),
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
      postProtocolStateChannel.multisigAddress,
      postProtocolStateChannel
    );

    yield [
      WRITE_COMMITMENT,
      Install,
      signedConditionalTransaction,
      newAppInstance.identityHash
    ];

    const freeBalanceUpdateData = new SetStateCommitment(
      network,
      postProtocolStateChannel.freeBalance.identity,
      postProtocolStateChannel.freeBalance.hashOfLatestState,
      postProtocolStateChannel.freeBalance.versionNumber,
      postProtocolStateChannel.freeBalance.timeout
    );

    assertIsValidSignature(
      preProtocolStateChannel.getFreeBalanceAddrOf(responderXpub),
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
      Update,
      signedFreeBalanceStateUpdate,
      postProtocolStateChannel.freeBalance.identityHash
    ];

    const {
      customData: { ack }
    } = yield [
      IO_SEND_AND_WAIT,
      {
        processID,
        protocol: Install,
        toXpub: responderXpub,
        customData: {
          signature: mySignatureOnFreeBalanceStateUpdate
        },
        seq: UNASSIGNED_SEQ_NO
      } as ProtocolMessage
    ];

    // TODO: better error typing here, should use const fn?
    if (!ack) {
      throw new Error(
        `did not receive ack from responder ${responderXpub} on Install protocol`
      );
    }
    // now initiator can release lock
  },

  /**
   * Sequence 1 of the INSTALL_PROTOCOL requires the responder party
   * to countersignsign the ConditionalTransactionCommitment and then sign
   * the update to the free balance object, wait for the intitiating party to
   * sign _that_ and then finish the protocol.
   *
   * @param {Context} context
   */

  1 /* Responding */: async function*(context: Context) {
    const {
      stateChannelsMap,
      message: {
        params,
        processID,
        customData: { signature }
      },
      network
    } = context;

    // Aliasing `signature` to this variable name for code clarity
    const counterpartySignatureOnConditionalTransaction = signature;

    const { initiatorXpub, multisigAddress } = params as InstallParams;

    const preProtocolStateChannel = stateChannelsMap.get(multisigAddress)!;

    const postProtocolStateChannel = computeStateChannelTransition(
      preProtocolStateChannel,
      params as InstallParams
    );

    const newAppInstance = postProtocolStateChannel.mostRecentlyInstalledAppInstance();

    const conditionalTransactionData = constructConditionalTransactionData(
      network,
      postProtocolStateChannel
    );

    assertIsValidSignature(
      preProtocolStateChannel.getFreeBalanceAddrOf(initiatorXpub),
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

    context.stateChannelsMap.set(
      postProtocolStateChannel.multisigAddress,
      postProtocolStateChannel
    );

    yield [
      WRITE_COMMITMENT,
      Install,
      signedConditionalTransaction,
      newAppInstance.identityHash
    ];

    const freeBalanceUpdateData = new SetStateCommitment(
      network,
      postProtocolStateChannel.freeBalance.identity,
      postProtocolStateChannel.freeBalance.hashOfLatestState,
      postProtocolStateChannel.freeBalance.versionNumber,
      postProtocolStateChannel.freeBalance.timeout
    );

    const mySignatureOnFreeBalanceStateUpdate = yield [
      OP_SIGN,
      freeBalanceUpdateData
    ];

    const {
      customData: { signature: counterpartySignatureOnFreeBalanceStateUpdate }
    } = yield [
      IO_SEND_AND_WAIT,
      {
        processID,
        protocol: Install,
        toXpub: initiatorXpub,
        customData: {
          signature: mySignatureOnConditionalTransaction,
          signature2: mySignatureOnFreeBalanceStateUpdate
        },
        seq: UNASSIGNED_SEQ_NO
      } as ProtocolMessage
    ];

    assertIsValidSignature(
      preProtocolStateChannel.getFreeBalanceAddrOf(initiatorXpub),
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
      Update,
      signedFreeBalanceStateUpdate,
      postProtocolStateChannel.freeBalance.identityHash
    ];

    yield [PERSIST_STATE_CHANNEL, postProtocolStateChannel];

    yield [
      IO_SEND,
      {
        processID,
        protocol: Install,
        toXpub: initiatorXpub,
        customData: {
          ack: true
        },
        seq: UNASSIGNED_SEQ_NO // is this the right seq no?
      } as ProtocolMessage
    ];
  }
};

/**
 * Generates the would-be new StateChannel to represent the final state of the
 * StateChannel after the protocol would be executed with correct signatures.
 *
 * @param {StateChannel} stateChannel - The pre-protocol state of the channel
 * @param {InstallParams} params - Parameters about the new AppInstance
 *
 * @returns {Promise<StateChannel>} - The post-protocol state of the channel
 */
function computeStateChannelTransition(
  stateChannel: StateChannel,
  params: InstallParams
): StateChannel {
  const {
    initiatorBalanceDecrement,
    responderBalanceDecrement,
    initiatorDepositTokenAddress,
    responderDepositTokenAddress,
    initiatorXpub,
    responderXpub,
    participants,
    initialState,
    appInterface,
    defaultTimeout,
    appSeqNo,
    outcomeType,
    disableLimit
  } = params;

  const initiatorFbAddress = stateChannel.getFreeBalanceAddrOf(initiatorXpub);
  const responderFbAddress = stateChannel.getFreeBalanceAddrOf(responderXpub);

  const {
    multiAssetMultiPartyCoinTransferInterpreterParams,
    twoPartyOutcomeInterpreterParams,
    singleAssetTwoPartyCoinTransferInterpreterParams
  } = computeInterpreterParameters(
    outcomeType,
    initiatorDepositTokenAddress,
    responderDepositTokenAddress,
    initiatorBalanceDecrement,
    responderBalanceDecrement,
    initiatorFbAddress,
    responderFbAddress,
    disableLimit
  );

  const appInstanceToBeInstalled = new AppInstance(
    /* participants */ participants,
    /* defaultTimeout */ defaultTimeout,
    /* appInterface */ appInterface,
    /* isVirtualApp */ false,
    /* appSeqNo */ appSeqNo,
    /* latestState */ initialState,
    /* latestVersionNumber */ 0,
    /* defaultTimeout */ defaultTimeout,
    /* outcomeType */ outcomeType,
    twoPartyOutcomeInterpreterParams,
    multiAssetMultiPartyCoinTransferInterpreterParams,
    singleAssetTwoPartyCoinTransferInterpreterParams
  );

  let tokenIndexedBalanceDecrement: TokenIndexedCoinTransferMap;
  if (initiatorDepositTokenAddress !== responderDepositTokenAddress) {
    tokenIndexedBalanceDecrement = {
      [initiatorDepositTokenAddress]: {
        [initiatorFbAddress]: initiatorBalanceDecrement
      },
      [responderDepositTokenAddress]: {
        [responderFbAddress]: responderBalanceDecrement
      }
    };
  } else {
    // If the decrements are on the same token, the previous block
    // sets the decrement only on the `respondingFbAddress` and the
    // `initiatingFbAddress` would get overwritten
    tokenIndexedBalanceDecrement = {
      [initiatorDepositTokenAddress]: {
        [initiatorFbAddress]: initiatorBalanceDecrement,
        [responderFbAddress]: responderBalanceDecrement
      }
    };
  }

  return stateChannel.installApp(
    appInstanceToBeInstalled,
    tokenIndexedBalanceDecrement
  );
}

/**
 * Returns the parameters for two hard-coded possible interpreter types.
 *
 * Note that this is _not_ a built-in part of the protocol. Here we are _restricting_
 * all newly installed AppInstances to be either of type COIN_TRANSFER or
 * TWO_PARTY_FIXED_OUTCOME. In the future, we will be extending the InstallParams
 * to indidicate the interpreterAddress and interpreterParams so the developers
 * installing apps have more control, however for now we are putting this logic
 * inside of the client (the Node) by adding an "outcomeType" variable which
 * is a simplification of the actual decision a developer has to make with their app.
 *
 * TODO: update doc on how MultiAssetMultiPartyCoinTransferInterpreterParams work
 *
 * @param {OutcomeType} outcomeType - either COIN_TRANSFER or TWO_PARTY_FIXED_OUTCOME
 * @param {BigNumber} initiatorBalanceDecrement - amount Wei initiator deposits
 * @param {BigNumber} responderBalanceDecrement - amount Wei responder deposits
 * @param {string} initiatorFbAddress - the address of the recipient of initiator
 * @param {string} responderFbAddress - the address of the recipient of responder
 *
 * @returns An object with the required parameters for both interpreter types, one
 * will be undefined and the other will be a correctly structured POJO. The AppInstance
 * object currently accepts both in its constructor and internally manages them.
 */
function computeInterpreterParameters(
  outcomeType: OutcomeType,
  initiatorDepositTokenAddress: string,
  responderDepositTokenAddress: string,
  initiatorBalanceDecrement: BigNumber,
  responderBalanceDecrement: BigNumber,
  initiatorFbAddress: string,
  responderFbAddress: string,
  disableLimit: boolean
): {
  twoPartyOutcomeInterpreterParams?: TwoPartyFixedOutcomeInterpreterParams;
  multiAssetMultiPartyCoinTransferInterpreterParams?: MultiAssetMultiPartyCoinTransferInterpreterParams;
  singleAssetTwoPartyCoinTransferInterpreterParams?: SingleAssetTwoPartyCoinTransferInterpreterParams;
} {
  switch (outcomeType) {
    case OutcomeType.TWO_PARTY_FIXED_OUTCOME: {
      if (initiatorDepositTokenAddress !== responderDepositTokenAddress) {
        throw Error(
          TWO_PARTY_OUTCOME_DIFFERENT_ASSETS(
            initiatorDepositTokenAddress,
            responderDepositTokenAddress
          )
        );
      }

      return {
        twoPartyOutcomeInterpreterParams: {
          tokenAddress: initiatorDepositTokenAddress,
          playerAddrs: [initiatorFbAddress, responderFbAddress],
          amount: initiatorBalanceDecrement.add(responderBalanceDecrement)
        }
      };
    }

    case OutcomeType.MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER: {
      return initiatorDepositTokenAddress === responderDepositTokenAddress
        ? {
            multiAssetMultiPartyCoinTransferInterpreterParams: {
              limit: [initiatorBalanceDecrement.add(responderBalanceDecrement)],
              tokenAddresses: [initiatorDepositTokenAddress]
            }
          }
        : {
            multiAssetMultiPartyCoinTransferInterpreterParams: {
              limit: [initiatorBalanceDecrement, responderBalanceDecrement],
              tokenAddresses: [
                initiatorDepositTokenAddress,
                responderDepositTokenAddress
              ]
            }
          };
    }

    case OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER: {
      if (initiatorDepositTokenAddress !== responderDepositTokenAddress) {
        throw Error(
          TWO_PARTY_OUTCOME_DIFFERENT_ASSETS(
            initiatorDepositTokenAddress,
            responderDepositTokenAddress
          )
        );
      }

      return {
        singleAssetTwoPartyCoinTransferInterpreterParams: {
          limit: disableLimit
            ? MaxUint256
            : initiatorBalanceDecrement.add(responderBalanceDecrement),
          tokenAddress: initiatorDepositTokenAddress
        }
      };
    }

    default: {
      throw Error(
        "The outcome type in this application logic contract is not supported yet."
      );
    }
  }
}

/**
 * Computes the ConditionalTransaction unsigned transaction from the multisignature
 * wallet that is required to be signed by all parties involved in the protocol.
 *
 * @param {NetworkContext} network - Metadata on the current blockchain
 * @param {OutcomeType} outcomeType - The outcome type of the AppInstance
 * @param {StateChannel} stateChannel - The post-protocol StateChannel
 *
 * @returns {ConditionalTransaction} A ConditionalTransaction object, ready to sign.
 */
function constructConditionalTransactionData(
  networkContext: NetworkContext,
  stateChannel: StateChannel
): ConditionalTransaction {
  const appInstance = stateChannel.mostRecentlyInstalledAppInstance();
  return new ConditionalTransaction(
    networkContext,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    appInstance.identityHash,
    stateChannel.freeBalance.identityHash,
    getInterpreterAddressFromOutcomeType(
      appInstance.outcomeType,
      networkContext
    ),
    appInstance.encodedInterpreterParams
  );
}

function getInterpreterAddressFromOutcomeType(
  outcomeType: OutcomeType,
  networkContext: NetworkContext
) {
  switch (outcomeType) {
    case OutcomeType.MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER: {
      return networkContext.MultiAssetMultiPartyCoinTransferInterpreter;
    }
    case OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER: {
      return networkContext.SingleAssetTwoPartyCoinTransferInterpreter;
    }
    case OutcomeType.TWO_PARTY_FIXED_OUTCOME: {
      return networkContext.TwoPartyFixedOutcomeInterpreter;
    }
    default: {
      throw Error(
        "The outcome type in this application logic contract is not supported yet."
      );
    }
  }
}
