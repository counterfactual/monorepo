/**
 * File notes:
 *
 * FIXME: This file over-uses the xkeyKthAddress function which
 *        is quite computationally expensive. Refactor to use it less.
 */

import { NetworkContext } from "@counterfactual/types";
import { AddressZero } from "ethers/constants";
import { bigNumberify, defaultAbiCoder } from "ethers/utils";

import { ConditionalTransaction, SetStateCommitment } from "../ethereum";
import { VirtualAppSetStateCommitment } from "../ethereum/virtual-app-set-state-commitment";
import { Opcode, Protocol } from "../machine/enums";
import {
  Context,
  InstallVirtualAppParams,
  ProtocolExecutionFlow,
  ProtocolMessage
} from "../machine/types";
import { computeUniqueIdentifierForStateChannelThatWrapsVirtualApp } from "../machine/virtual-app-unique-identifier";
import { sortAddresses, xkeyKthAddress } from "../machine/xkeys";
import { AppInstance, StateChannel } from "../models";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../models/free-balance";
import { getCreate2MultisigAddress } from "../utils";

import { UNASSIGNED_SEQ_NO } from "./utils/signature-forwarder";
import { assertIsValidSignature } from "./utils/signature-validator";

/**
 * As specified in TwoPartyFixedOutcomeFromVirtualAppETHInterpreter.sol
 *
 * NOTE: It seems like you can't put "payable" inside this string, ethers doesn't
 *       know how to interpret it. However, the encoder encodes it the same way
 *       without specifying it anyway, so that's why beneficiaries is address[2]
 *       despite what you see in TwoPartyFixedOutcomeFromVirtualAppETHInterpreter.
 *
 */
const SINGLE_ASSET_TWO_PARTY_INTERMEDIARY_AGREEMENT_ENCODING = `
  tuple(
    uint256 capitalProvided,
    uint256 expiryBlock,
    address[2] beneficiaries
  )
`;

const encodeTwoPartyFixedOutcomeFromVirtualAppETHInterpreterParams = params =>
  defaultAbiCoder.encode(
    [SINGLE_ASSET_TWO_PARTY_INTERMEDIARY_AGREEMENT_ENCODING],
    [params]
  );

const protocol = Protocol.InstallVirtualApp;

/**
 * This exchange is described at the following URL:
 *
 * https://specs.counterfactual.com/en/latest/protocols/install-virtual-app.html
 */
export const INSTALL_VIRTUAL_APP_PROTOCOL: ProtocolExecutionFlow = {
  0 /* Initiating */: async function*(context: Context) {
    const {
      message: { params, protocolExecutionID },
      stateChannelsMap,
      network
    } = context;

    const {
      intermediaryXpub,
      respondingXpub
    } = params as InstallVirtualAppParams;

    const [
      stateChannelWithResponding,
      stateChannelWithIntermediary,
      virtualAppInstance
    ] = getUpdatedStateChannelAndVirtualAppObjectsForInitiating(
      params as InstallVirtualAppParams,
      stateChannelsMap,
      network
    );

    const intermediaryAddress = stateChannelWithIntermediary.getMultisigOwnerAddrOf(
      intermediaryXpub
    );

    const respondingAddress = stateChannelWithResponding.getMultisigOwnerAddrOf(
      respondingXpub
    );

    const presignedMultisigTxForAliceIngridVirtualAppAgreement = new ConditionalTransaction(
      network,
      stateChannelWithIntermediary.multisigAddress,
      stateChannelWithIntermediary.multisigOwners,
      virtualAppInstance.identityHash,
      stateChannelWithIntermediary.freeBalance.identityHash,
      network.TwoPartyFixedOutcomeFromVirtualAppETHInterpreter,
      encodeTwoPartyFixedOutcomeFromVirtualAppETHInterpreterParams(
        stateChannelWithIntermediary.getSingleAssetTwoPartyIntermediaryAgreementFromVirtualApp(
          virtualAppInstance.identityHash
        )
      )
    );

    const initiatingSignatureOnAliceIngridVirtualAppAgreement = yield [
      Opcode.OP_SIGN,
      presignedMultisigTxForAliceIngridVirtualAppAgreement
    ];

    const m1 = {
      params, // Must include as this is the first message received by intermediary
      protocol,
      protocolExecutionID,
      toXpub: intermediaryXpub,
      seq: 1,
      signature: initiatingSignatureOnAliceIngridVirtualAppAgreement
    } as ProtocolMessage;

    const m4 = yield [Opcode.IO_SEND_AND_WAIT, m1];

    const {
      signature: intermediarySignatureOnAliceIngridVirtualAppAgreement,
      signature2: intermediarySignatureOnAliceIngridFreeBalanceAppActivation
    } = m4;

    // TODO: require(signature on virtual app agreement is good)

    assertIsValidSignature(
      intermediaryAddress,
      presignedMultisigTxForAliceIngridVirtualAppAgreement,
      intermediarySignatureOnAliceIngridVirtualAppAgreement,
      true
    );

    // TODO: write to DB

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.InstallVirtualApp, // TODO: Figure out how to map this to save to DB correctly
      presignedMultisigTxForAliceIngridVirtualAppAgreement.getSignedTransaction(
        [
          initiatingSignatureOnAliceIngridVirtualAppAgreement,
          intermediarySignatureOnAliceIngridVirtualAppAgreement
        ]
      ),
      virtualAppInstance.identityHash
    ];

    // TODO: compute free balance app activation commitment

    const freeBalanceAliceIngridVirtualAppAgreementActivationCommitment = new SetStateCommitment(
      network,
      stateChannelWithIntermediary.freeBalance.identity,
      stateChannelWithIntermediary.freeBalance.hashOfLatestState,
      stateChannelWithIntermediary.freeBalance.versionNumber,
      stateChannelWithIntermediary.freeBalance.timeout
    );

    // TODO: require(signature on free balance app activation is good

    assertIsValidSignature(
      intermediaryAddress,
      freeBalanceAliceIngridVirtualAppAgreementActivationCommitment,
      intermediarySignatureOnAliceIngridFreeBalanceAppActivation,
      true
    );

    // TODO: sign free balance app activation

    const initiatingSignatureOnAliceIngridFreeBalanceAppActivation = yield [
      Opcode.OP_SIGN,
      freeBalanceAliceIngridVirtualAppAgreementActivationCommitment
    ];

    // TODO: write to DB

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      freeBalanceAliceIngridVirtualAppAgreementActivationCommitment.getSignedTransaction(
        [
          initiatingSignatureOnAliceIngridFreeBalanceAppActivation,
          intermediarySignatureOnAliceIngridFreeBalanceAppActivation
        ]
      ),
      stateChannelWithIntermediary.freeBalance.identityHash
    ];

    // TODO: compute virtual app set state commitment

    const virtualAppSetStateCommitmentWithIntermediary = new VirtualAppSetStateCommitment(
      network,
      virtualAppInstance.identity,
      virtualAppInstance.defaultTimeout,
      virtualAppInstance.hashOfLatestState,
      virtualAppInstance.versionNumber
    );

    // TODO: sign virtual app set state commitment

    const initiatingSignatureOnVirtualAppSetStateCommitment = yield [
      Opcode.OP_SIGN,
      virtualAppSetStateCommitmentWithIntermediary
    ];

    // TODO: send [ FB, VA ] to intermediary

    const m5 = {
      protocol,
      protocolExecutionID,
      toXpub: intermediaryXpub,
      seq: UNASSIGNED_SEQ_NO,
      signature: initiatingSignatureOnAliceIngridFreeBalanceAppActivation,
      signature2: initiatingSignatureOnVirtualAppSetStateCommitment
    } as ProtocolMessage;

    const m8 = yield [Opcode.IO_SEND_AND_WAIT, m5];

    const {
      signature: intermediarySignatureOnVirtualAppSetStateCommitment,
      signature2: respondingSignatureOnVirtualAppSetStateCommitment
    } = m8;

    // TODO: require(signatures on virtual app agreement are OK)

    assertIsValidSignature(
      intermediaryAddress,
      virtualAppSetStateCommitmentWithIntermediary,
      intermediarySignatureOnVirtualAppSetStateCommitment,
      true
    );

    assertIsValidSignature(
      respondingAddress,
      virtualAppSetStateCommitmentWithIntermediary,
      respondingSignatureOnVirtualAppSetStateCommitment
    );

    // TODO: Save to DB

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      virtualAppSetStateCommitmentWithIntermediary.getSignedTransaction(
        [
          initiatingSignatureOnVirtualAppSetStateCommitment,
          respondingSignatureOnVirtualAppSetStateCommitment
        ],
        intermediarySignatureOnVirtualAppSetStateCommitment
      ),
      virtualAppInstance.identityHash
    ];

    // TODO: save to context

    context.stateChannelsMap.set(
      stateChannelWithIntermediary.multisigAddress,
      stateChannelWithIntermediary
    );

    context.stateChannelsMap.set(
      stateChannelWithResponding.multisigAddress,
      stateChannelWithResponding
    );
  },

  1 /* Intermediary */: async function*(context: Context) {
    const {
      message: { params, protocolExecutionID, signature },
      stateChannelsMap,
      network
    } = context;

    const {
      initiatingXpub,
      respondingXpub
    } = params as InstallVirtualAppParams;

    // Aliasing `signature` to this variable name for code clarity
    const initiatingSignatureOnAliceIngridVirtualAppAgreement = signature;

    const [
      stateChannelBetweenVirtualAppUsers,
      stateChannelWithInitiating,
      stateChannelWithResponding,
      virtualAppInstance
    ] = getUpdatedStateChannelAndVirtualAppObjectsForIntermediary(
      params as InstallVirtualAppParams,
      stateChannelsMap,
      network
    );

    const initiatingAddress = stateChannelWithInitiating.getMultisigOwnerAddrOf(
      initiatingXpub
    );

    const respondingAddress = stateChannelWithResponding.getMultisigOwnerAddrOf(
      respondingXpub
    );

    // TODO: compute conditional transaction for the initiating party

    const presignedMultisigTxForAliceIngridVirtualAppAgreement = new ConditionalTransaction(
      network,
      stateChannelWithInitiating.multisigAddress,
      stateChannelWithInitiating.multisigOwners,
      virtualAppInstance.identityHash,
      stateChannelWithInitiating.freeBalance.identityHash,
      network.TwoPartyFixedOutcomeFromVirtualAppETHInterpreter,
      encodeTwoPartyFixedOutcomeFromVirtualAppETHInterpreterParams(
        stateChannelWithInitiating.getSingleAssetTwoPartyIntermediaryAgreementFromVirtualApp(
          virtualAppInstance.identityHash
        )
      )
    );

    // TODO: require(signature on conditional transaction is good from initiating)

    assertIsValidSignature(
      initiatingAddress,
      presignedMultisigTxForAliceIngridVirtualAppAgreement,
      initiatingSignatureOnAliceIngridVirtualAppAgreement
    );

    // TODO: compute conditional transaction for the responding party

    const presignedMultisigTxForIngridBobVirtualAppAgreement = new ConditionalTransaction(
      network,
      stateChannelWithResponding.multisigAddress,
      stateChannelWithResponding.multisigOwners,
      virtualAppInstance.identityHash,
      stateChannelWithResponding.freeBalance.identityHash,
      network.TwoPartyFixedOutcomeFromVirtualAppETHInterpreter,
      encodeTwoPartyFixedOutcomeFromVirtualAppETHInterpreterParams(
        stateChannelWithResponding.getSingleAssetTwoPartyIntermediaryAgreementFromVirtualApp(
          virtualAppInstance.identityHash
        )
      )
    );

    // TODO: sign conditional transaction

    const intermediarySignatureOnIngridBobVirtualAppAgreement = yield [
      Opcode.OP_SIGN,
      presignedMultisigTxForIngridBobVirtualAppAgreement
    ];

    // TODO: send conditional transaction to responding

    const m2 = {
      params, // Must include as this is the first message received by responding
      protocol,
      protocolExecutionID,
      seq: 2,
      toXpub: respondingXpub,
      signature: intermediarySignatureOnIngridBobVirtualAppAgreement
    } as ProtocolMessage;

    const m3 = yield [Opcode.IO_SEND_AND_WAIT, m2];

    const {
      signature: respondingSignatureOnIngridBobVirtualAppAgreement,
      signature2: respondingSignatureOnIngridBobFreeBalanceAppActivation
    } = m3;

    // TODO: require(signature on conditional transaction is good from responding

    assertIsValidSignature(
      respondingAddress,
      presignedMultisigTxForIngridBobVirtualAppAgreement,
      respondingSignatureOnIngridBobVirtualAppAgreement
    );

    // TODO: compute free balance activation from responding

    const freeBalanceIngridBobVirtualAppAgreementActivationCommitment = new SetStateCommitment(
      network,
      stateChannelWithResponding.freeBalance.identity,
      stateChannelWithResponding.freeBalance.hashOfLatestState,
      stateChannelWithResponding.freeBalance.versionNumber,
      stateChannelWithResponding.freeBalance.timeout
    );

    // TODO: require( signature on free balance app activation is good)

    assertIsValidSignature(
      respondingAddress,
      freeBalanceIngridBobVirtualAppAgreementActivationCommitment,
      respondingSignatureOnIngridBobFreeBalanceAppActivation
    );

    // TODO: compute free balance app activation for initiating

    const freeBalanceAliceIngridVirtualAppAgreementActivationCommitment = new SetStateCommitment(
      network,
      stateChannelWithInitiating.freeBalance.identity,
      stateChannelWithInitiating.freeBalance.hashOfLatestState,
      stateChannelWithInitiating.freeBalance.versionNumber,
      stateChannelWithInitiating.freeBalance.timeout
    );

    // TODO: sign free balance app activation commitment with initiating

    const intermediarySignatureOnAliceIngridFreeBalanceAppActivation = yield [
      Opcode.OP_SIGN,
      freeBalanceAliceIngridVirtualAppAgreementActivationCommitment
    ];

    // TODO: sign conditional transaction for initiating

    const intermediarySignatureOnAliceIngridVirtualAppAgreement = yield [
      Opcode.OP_SIGN,
      presignedMultisigTxForAliceIngridVirtualAppAgreement
    ];

    // TODO: write to DB

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.InstallVirtualApp,
      presignedMultisigTxForAliceIngridVirtualAppAgreement.getSignedTransaction(
        [
          initiatingSignatureOnAliceIngridVirtualAppAgreement,
          intermediarySignatureOnAliceIngridVirtualAppAgreement
        ]
      ),
      virtualAppInstance.identityHash
    ];

    // TODO: send [ CT, FB ] to initiating

    const m4 = {
      protocol,
      protocolExecutionID,
      seq: UNASSIGNED_SEQ_NO,
      toXpub: initiatingXpub,
      signature: intermediarySignatureOnAliceIngridVirtualAppAgreement,
      signature2: intermediarySignatureOnAliceIngridFreeBalanceAppActivation
    } as ProtocolMessage;

    const m5 = yield [Opcode.IO_SEND_AND_WAIT, m4];

    const {
      signature: initiatingSignatureOnAliceIngridFreeBalanceAppActivation,
      signature2: initiatingSignatureOnVirtualAppSetStateCommitment
    } = m5;

    // TODO: require(signature on free balance activation with initiaitng is good)

    assertIsValidSignature(
      initiatingAddress,
      freeBalanceAliceIngridVirtualAppAgreementActivationCommitment,
      initiatingSignatureOnAliceIngridFreeBalanceAppActivation
    );

    // TODO: write to db

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      freeBalanceIngridBobVirtualAppAgreementActivationCommitment.getSignedTransaction(
        [
          initiatingSignatureOnAliceIngridFreeBalanceAppActivation,
          intermediarySignatureOnAliceIngridFreeBalanceAppActivation
        ]
      ),
      stateChannelWithResponding.freeBalance.identityHash
    ];

    // TODO: compute virtual app set state commitment

    const virtualAppSetStateCommitmentWithIntermediary = new VirtualAppSetStateCommitment(
      network,
      virtualAppInstance.identity,
      virtualAppInstance.defaultTimeout,
      virtualAppInstance.hashOfLatestState,
      virtualAppInstance.versionNumber
    );

    // TODO: require(signature on virtual app set state from initiaitng is good)

    assertIsValidSignature(
      initiatingAddress,
      virtualAppSetStateCommitmentWithIntermediary,
      initiatingSignatureOnVirtualAppSetStateCommitment
    );

    // TODO: sign free balance update with responding

    const intermediarySignatureOnIngridBobFreeBalanceAppActivation = yield [
      Opcode.OP_SIGN,
      freeBalanceIngridBobVirtualAppAgreementActivationCommitment
    ];

    // TODO: write to DB

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      freeBalanceIngridBobVirtualAppAgreementActivationCommitment.getSignedTransaction(
        [
          respondingSignatureOnIngridBobFreeBalanceAppActivation,
          intermediarySignatureOnIngridBobFreeBalanceAppActivation
        ]
      ),
      stateChannelWithResponding.freeBalance.identityHash
    ];

    // TODO: sign virtual app set state

    const intermediarySignatureOnVirtualAppSetStateCommitment = yield [
      Opcode.OP_SIGN_AS_INTERMEDIARY,
      virtualAppSetStateCommitmentWithIntermediary
    ];

    // TODO: send [ FB, VA ] to responding

    const m6 = {
      protocol,
      protocolExecutionID,
      toXpub: respondingXpub,
      seq: UNASSIGNED_SEQ_NO,
      signature: intermediarySignatureOnIngridBobFreeBalanceAppActivation,
      signature2: intermediarySignatureOnVirtualAppSetStateCommitment,
      signature3: initiatingSignatureOnVirtualAppSetStateCommitment
    } as ProtocolMessage;

    const m7 = yield [Opcode.IO_SEND_AND_WAIT, m6];

    const { signature: respondingSignatureOnVirtualAppSetStateCommitment } = m7;

    // TODO: require virtual app set state is good from responding

    assertIsValidSignature(
      respondingAddress,
      virtualAppSetStateCommitmentWithIntermediary,
      respondingSignatureOnVirtualAppSetStateCommitment
    );

    // TODO: write to DB

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      virtualAppSetStateCommitmentWithIntermediary.getSignedTransaction(
        [
          initiatingSignatureOnVirtualAppSetStateCommitment,
          respondingSignatureOnVirtualAppSetStateCommitment
        ],
        intermediarySignatureOnVirtualAppSetStateCommitment
      ),
      virtualAppInstance.identityHash
    ];

    // TODO: forward the virtual app set state to the initiating

    const m8 = {
      protocol,
      protocolExecutionID,
      toXpub: initiatingXpub,
      seq: UNASSIGNED_SEQ_NO,
      signature: intermediarySignatureOnVirtualAppSetStateCommitment,
      signature2: respondingSignatureOnVirtualAppSetStateCommitment
    } as ProtocolMessage;

    yield [Opcode.IO_SEND, m8];

    // TODO: save to context

    context.stateChannelsMap.set(
      stateChannelBetweenVirtualAppUsers.multisigAddress,
      stateChannelBetweenVirtualAppUsers
    );

    context.stateChannelsMap.set(
      stateChannelWithInitiating.multisigAddress,
      stateChannelWithInitiating
    );

    context.stateChannelsMap.set(
      stateChannelWithResponding.multisigAddress,
      stateChannelWithResponding
    );
  },

  2 /* Responding */: async function*(context: Context) {
    const {
      message: { params, protocolExecutionID, signature },
      stateChannelsMap,
      network
    } = context;

    const {
      intermediaryXpub,
      initiatingXpub
    } = params as InstallVirtualAppParams;

    const [
      stateChannelWithInitiating,
      stateChannelWithIntermediary,
      virtualAppInstance
    ] = getUpdatedStateChannelAndVirtualAppObjectsForResponding(
      params as InstallVirtualAppParams,
      stateChannelsMap,
      network
    );

    // Aliasing `signature` to this variable name for code clarity
    const intermediarySignatureOnIngridBobVirtualAppAgreement = signature;

    const intermediaryAddress = stateChannelWithIntermediary.getMultisigOwnerAddrOf(
      intermediaryXpub
    );

    const initiatingAddress = stateChannelWithInitiating.getMultisigOwnerAddrOf(
      initiatingXpub
    );

    // TODO: compute conditional transaction for the intermeidary party

    const presignedMultisigTxForIngridBobVirtualAppAgreement = new ConditionalTransaction(
      network,
      stateChannelWithIntermediary.multisigAddress,
      stateChannelWithIntermediary.multisigOwners,
      virtualAppInstance.identityHash,
      stateChannelWithIntermediary.freeBalance.identityHash,
      network.TwoPartyFixedOutcomeFromVirtualAppETHInterpreter,
      encodeTwoPartyFixedOutcomeFromVirtualAppETHInterpreterParams(
        stateChannelWithIntermediary.getSingleAssetTwoPartyIntermediaryAgreementFromVirtualApp(
          virtualAppInstance.identityHash
        )
      )
    );

    // TODO: require(signature on virtual app agreement is good from)

    assertIsValidSignature(
      intermediaryAddress,
      presignedMultisigTxForIngridBobVirtualAppAgreement,
      intermediarySignatureOnIngridBobVirtualAppAgreement,
      true
    );

    // TODO: sign conditional transaction

    const respondingSignatureOnIngridBobVirtualAppAgreement = yield [
      Opcode.OP_SIGN,
      presignedMultisigTxForIngridBobVirtualAppAgreement
    ];

    // TODO: write to DB

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.InstallVirtualApp, // TODO: Figure out how to map this to save to DB correctly
      presignedMultisigTxForIngridBobVirtualAppAgreement.getSignedTransaction([
        respondingSignatureOnIngridBobVirtualAppAgreement,
        intermediarySignatureOnIngridBobVirtualAppAgreement
      ]),
      virtualAppInstance.identityHash
    ];

    // TODO: compute free balance app activation commitment

    const freeBalanceIngridBobVirtualAppAgreementActivationCommitment = new SetStateCommitment(
      network,
      stateChannelWithIntermediary.freeBalance.identity,
      stateChannelWithIntermediary.freeBalance.hashOfLatestState,
      stateChannelWithIntermediary.freeBalance.versionNumber,
      stateChannelWithIntermediary.freeBalance.timeout
    );

    // TODO: sign free balabce app activation commitment

    const respondingSignatureOnIngridBobFreeBalanceAppActivation = yield [
      Opcode.OP_SIGN,
      freeBalanceIngridBobVirtualAppAgreementActivationCommitment
    ];

    // TODO: send free balance app activation and conditional transaction countersig to intermediary

    const m3 = {
      protocol,
      protocolExecutionID,
      toXpub: intermediaryXpub,
      seq: UNASSIGNED_SEQ_NO,
      signature: respondingSignatureOnIngridBobVirtualAppAgreement,
      signature2: respondingSignatureOnIngridBobFreeBalanceAppActivation
    } as ProtocolMessage;

    const m6 = yield [Opcode.IO_SEND_AND_WAIT, m3];

    const {
      signature: intermediarySignatureOnIngridBobFreeBalanceAppActivation,
      signature2: intermediarySignatureOnVirtualAppSetStateCommitment,
      signature3: initiatingSignatureOnVirtualAppSetStateCommitment
    } = m6;

    // TODO: require(signature on free balance app activation is good

    assertIsValidSignature(
      intermediaryAddress,
      freeBalanceIngridBobVirtualAppAgreementActivationCommitment,
      intermediarySignatureOnIngridBobFreeBalanceAppActivation,
      true
    );

    // TODO: write to DB

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      freeBalanceIngridBobVirtualAppAgreementActivationCommitment.getSignedTransaction(
        [
          intermediarySignatureOnIngridBobFreeBalanceAppActivation,
          respondingSignatureOnIngridBobFreeBalanceAppActivation
        ]
      ),
      stateChannelWithIntermediary.freeBalance.identityHash
    ];

    // TODO: compute virtual app set state commitment

    const virtualAppSetStateCommitmentWithIntermediary = new VirtualAppSetStateCommitment(
      network,
      virtualAppInstance.identity,
      virtualAppInstance.defaultTimeout,
      virtualAppInstance.hashOfLatestState,
      virtualAppInstance.versionNumber
    );

    // TODO: require virtual app set state commitment sigs by intermediary and initiaitng are good

    assertIsValidSignature(
      intermediaryAddress,
      virtualAppSetStateCommitmentWithIntermediary,
      intermediarySignatureOnVirtualAppSetStateCommitment,
      true
    );

    assertIsValidSignature(
      initiatingAddress,
      virtualAppSetStateCommitmentWithIntermediary,
      initiatingSignatureOnVirtualAppSetStateCommitment
    );

    // TODO: sign virtual app set state commitment balance app activation

    const respondingSignatureOnVirtualAppSetStateCommitment = yield [
      Opcode.OP_SIGN,
      virtualAppSetStateCommitmentWithIntermediary
    ];

    // TODO: write to DB

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      virtualAppSetStateCommitmentWithIntermediary.getSignedTransaction(
        [
          initiatingSignatureOnVirtualAppSetStateCommitment,
          respondingSignatureOnVirtualAppSetStateCommitment
        ],
        intermediarySignatureOnVirtualAppSetStateCommitment
      ),
      virtualAppInstance.identityHash
    ];

    // TODO: send [ VA ] to intermediary

    const m7 = {
      protocol,
      protocolExecutionID,
      toXpub: intermediaryXpub,
      seq: UNASSIGNED_SEQ_NO,
      signature: respondingSignatureOnVirtualAppSetStateCommitment
    } as ProtocolMessage;

    yield [Opcode.IO_SEND, m7];

    context.stateChannelsMap.set(
      stateChannelWithIntermediary.multisigAddress,
      stateChannelWithIntermediary
    );

    context.stateChannelsMap.set(
      stateChannelWithInitiating.multisigAddress,
      stateChannelWithInitiating
    );
  }
};

/**
 * Creates a shared AppInstance that represents the Virtual App being installed.
 *
 * NOTE: The VirtualApp is currently HARD-CODED to only work with interpreters
 *       that can understand the TwoPartyFixedOutcome outcome type. Currently
 *       we use the TwoPartyFixedOutcomeFromVirtualAppETHInterpreter for all
 *       commitments between users and intermediaries to handle Virtual Apps.
 *
 *       Also, take notice that the `signingKeys` for this app are encoded as
 *       [ intermediaryKey(seqNo), ...(sorted keys of initiating and responding)]
 *
 *       Which is the convention for Virtual Apps since we expect the 0th signing
 *       key to sign a different sigest in set state commitments. See
 *       MixinVirtualAppSetState to see the solidity code for this convention.
 *
 * @param {StateChannel} stateChannelThatWrapsVirtualApp - The StateChannel object between the endpoints
 * @param {InstallVirtualAppParams} params - Parameters of the new App to be installed
 *
 * @returns {AppInstance} an AppInstance with the correct metadata
 */
function constructVirtualAppInstance(
  stateChannelThatWrapsVirtualApp: StateChannel,
  params: InstallVirtualAppParams
): AppInstance {
  const {
    intermediaryXpub,
    initiatingXpub,
    respondingXpub,
    defaultTimeout,
    appInterface,
    initialState,
    initiatingBalanceDecrement,
    respondingBalanceDecrement
  } = params;

  const seqNo = stateChannelThatWrapsVirtualApp.numInstalledApps;

  const intermediaryAddress = xkeyKthAddress(intermediaryXpub, seqNo);
  const initiatingAddress = xkeyKthAddress(initiatingXpub, seqNo);
  const respondingAddress = xkeyKthAddress(respondingXpub, seqNo);

  return new AppInstance(
    /* multisigAddress */ AddressZero,
    /* signingKeys */
    [
      intermediaryAddress,
      ...sortAddresses([initiatingAddress, respondingAddress])
    ],
    /* defaultTimeout */ defaultTimeout,
    /* appInterface */ appInterface,
    /* isVirtualApp */ true,
    /* appSeqNo */ seqNo,
    /* initialState */ initialState,
    /* versionNumber */ 0,
    /* latestTimeout */ defaultTimeout,
    /* twoPartyOutcomeInterpreterParams */
    {
      playerAddrs: [initiatingAddress, respondingAddress],
      amount: bigNumberify(initiatingBalanceDecrement).add(
        respondingBalanceDecrement
      )
    },
    /* coinTransferInterpreterParams */ undefined
  );
}

/**
 * Fetches a MetaChannel object from the stateChannelsMap or returns a new one.
 *
 * Note that this method has the "getOrCreate" prefix because if this is the _first_
 * time that a virtual app is instantiated between these counterparties that goes
 * through this intermediary then the `StateChannel` will not exist in the stateChannelsMap
 * of any of the participants so it needs to be created. If, however, this is not the first
 * time then there will be an object in the stateChannelsMap that can be fetched by using
 * the unique identifier for the wrapper StateChannel.
 *
 * @param {Map<string, StateChannel>} stateChannelsMap - map of StateChannels to query
 * @param {[string, string]} userXpubs - List of users expected in stateChannelThatWrapsVirtualApp with intermediary
 * @param {string} intermediaryXpub - Intermediary for this particular stateChannelThatWrapsVirtualApp
 *
 * @returns {StateChannel} - a stateChannelThatWrapsVirtualApp
 */
function getOrCreateStateChannelThatWrapsVirtualAppInstance(
  stateChannelsMap: Map<string, StateChannel>,
  userXpubs: [string, string],
  intermediaryXpub: string
): StateChannel {
  const uid = computeUniqueIdentifierForStateChannelThatWrapsVirtualApp(
    userXpubs,
    intermediaryXpub
  );

  return (
    stateChannelsMap.get(uid) || StateChannel.createEmptyChannel(uid, userXpubs)
  );
}

function getUpdatedStateChannelAndVirtualAppObjectsForInitiating(
  params: InstallVirtualAppParams,
  stateChannelsMap: Map<string, StateChannel>,
  network: NetworkContext
): [StateChannel, StateChannel, AppInstance] {
  const {
    initiatingBalanceDecrement,
    respondingBalanceDecrement,
    tokenAddress,
    initiatingXpub,
    intermediaryXpub,
    respondingXpub
  } = params as InstallVirtualAppParams;

  const stateChannelThatWrapsVirtualApp = getOrCreateStateChannelThatWrapsVirtualAppInstance(
    stateChannelsMap,
    [initiatingXpub, respondingXpub],
    intermediaryXpub
  );

  const virtualAppInstance = constructVirtualAppInstance(
    stateChannelThatWrapsVirtualApp,
    params
  );

  const initiatingAddress = xkeyKthAddress(initiatingXpub, 0);
  const intermediaryAddress = xkeyKthAddress(intermediaryXpub, 0);

  const stateChannelWithIntermediary = stateChannelsMap.get(
    getCreate2MultisigAddress(
      [initiatingXpub, intermediaryXpub],
      network.ProxyFactory,
      network.MinimumViableMultisig
    )
  );

  if (!stateChannelWithIntermediary) {
    throw Error(
      "Cannot run InstallVirtualAppProtocol without existing channel with intermediary"
    );
  }

  const newStateChannel = stateChannelWithIntermediary.addSingleAssetTwoPartyIntermediaryAgreement(
    virtualAppInstance.identityHash,
    {
      expiryBlock: 100_000_000_000,
      capitalProvided: bigNumberify(initiatingBalanceDecrement).add(
        respondingBalanceDecrement
      ),
      beneficiaries: [initiatingAddress, intermediaryAddress]
    },
    {
      [initiatingAddress]: initiatingBalanceDecrement,
      [intermediaryAddress]: respondingBalanceDecrement
    },
    tokenAddress
  );

  return [
    stateChannelThatWrapsVirtualApp.addVirtualAppInstance(virtualAppInstance),
    newStateChannel,
    virtualAppInstance
  ];
}

function getUpdatedStateChannelAndVirtualAppObjectsForIntermediary(
  params: InstallVirtualAppParams,
  stateChannelsMap: Map<string, StateChannel>,
  network: NetworkContext
): [StateChannel, StateChannel, StateChannel, AppInstance] {
  const {
    initiatingBalanceDecrement,
    respondingBalanceDecrement,
    initiatingXpub,
    intermediaryXpub,
    respondingXpub
  } = params as InstallVirtualAppParams;

  const stateChannelBetweenVirtualAppUsers = getOrCreateStateChannelThatWrapsVirtualAppInstance(
    stateChannelsMap,
    [initiatingXpub, respondingXpub],
    intermediaryXpub
  );

  const virtualAppInstance = constructVirtualAppInstance(
    stateChannelBetweenVirtualAppUsers,
    params
  );

  const channelWithInitiating = stateChannelsMap.get(
    getCreate2MultisigAddress(
      [initiatingXpub, intermediaryXpub],
      network.ProxyFactory,
      network.MinimumViableMultisig
    )
  );

  if (!channelWithInitiating) {
    throw Error(
      "Cannot mediate InstallVirtualAppProtocol without mediation channel to initiating"
    );
  }

  const channelWithResponding = stateChannelsMap.get(
    getCreate2MultisigAddress(
      [respondingXpub, intermediaryXpub],
      network.ProxyFactory,
      network.MinimumViableMultisig
    )
  );

  if (!channelWithResponding) {
    throw Error(
      "Cannot mediate InstallVirtualAppProtocol without mediation channel to responding"
    );
  }

  const initiatingAddress = xkeyKthAddress(initiatingXpub, 0);
  const intermediaryAddress = xkeyKthAddress(intermediaryXpub, 0);
  const respondingAddress = xkeyKthAddress(respondingXpub, 0);

  const stateChannelWithInitiating = channelWithInitiating.addSingleAssetTwoPartyIntermediaryAgreement(
    virtualAppInstance.identityHash,
    {
      expiryBlock: 100_000_000_000,
      capitalProvided: bigNumberify(initiatingBalanceDecrement).add(
        respondingBalanceDecrement
      ),
      beneficiaries: [initiatingAddress, intermediaryAddress]
    },
    {
      [initiatingAddress]: initiatingBalanceDecrement,
      [intermediaryAddress]: respondingBalanceDecrement
    },
    CONVENTION_FOR_ETH_TOKEN_ADDRESS
  );

  const stateChannelWithResponding = channelWithResponding.addSingleAssetTwoPartyIntermediaryAgreement(
    virtualAppInstance.identityHash,
    {
      expiryBlock: 100_000_000_000,
      capitalProvided: bigNumberify(initiatingBalanceDecrement).add(
        respondingBalanceDecrement
      ),
      beneficiaries: [intermediaryAddress, respondingAddress]
    },
    {
      [intermediaryAddress]: initiatingBalanceDecrement,
      [respondingAddress]: respondingBalanceDecrement
    },
    CONVENTION_FOR_ETH_TOKEN_ADDRESS
  );

  return [
    stateChannelBetweenVirtualAppUsers.addVirtualAppInstance(
      virtualAppInstance
    ),
    stateChannelWithInitiating,
    stateChannelWithResponding,
    virtualAppInstance
  ];
}

function getUpdatedStateChannelAndVirtualAppObjectsForResponding(
  params: InstallVirtualAppParams,
  stateChannelsMap: Map<string, StateChannel>,
  network: NetworkContext
): [StateChannel, StateChannel, AppInstance] {
  const {
    initiatingBalanceDecrement,
    respondingBalanceDecrement,
    initiatingXpub,
    intermediaryXpub,
    respondingXpub
  } = params as InstallVirtualAppParams;

  const stateChannelThatWrapsVirtualApp = getOrCreateStateChannelThatWrapsVirtualAppInstance(
    stateChannelsMap,
    [initiatingXpub, respondingXpub],
    intermediaryXpub
  );

  const virtualAppInstance = constructVirtualAppInstance(
    stateChannelThatWrapsVirtualApp,
    params
  );

  const stateChannelWithIntermediary = stateChannelsMap.get(
    getCreate2MultisigAddress(
      [respondingXpub, intermediaryXpub],
      network.ProxyFactory,
      network.MinimumViableMultisig
    )
  );

  if (!stateChannelWithIntermediary) {
    throw Error(
      "Cannot run InstallVirtualAppProtocol without existing channel with intermediary"
    );
  }

  const intermediaryAddress = xkeyKthAddress(intermediaryXpub, 0);
  const respondingAddress = xkeyKthAddress(respondingXpub, 0);

  const newStateChannel = stateChannelWithIntermediary.addSingleAssetTwoPartyIntermediaryAgreement(
    virtualAppInstance.identityHash,
    {
      expiryBlock: 100_000_000_000,
      capitalProvided: bigNumberify(initiatingBalanceDecrement).add(
        respondingBalanceDecrement
      ),
      beneficiaries: [intermediaryAddress, respondingAddress]
    },
    {
      [intermediaryAddress]: initiatingBalanceDecrement,
      [respondingAddress]: respondingBalanceDecrement
    },
    CONVENTION_FOR_ETH_TOKEN_ADDRESS
  );

  return [
    stateChannelThatWrapsVirtualApp.addVirtualAppInstance(virtualAppInstance),
    newStateChannel,
    virtualAppInstance
  ];
}
