/**
 * File notes:
 *
 * FIXME: This file over-uses the xkeyKthAddress function which
 *        is quite computationally expensive. Refactor to use it less.
 */

import { NetworkContext } from "@counterfactual/types";
import { AddressZero, Zero } from "ethers/constants";
import { BaseProvider } from "ethers/providers";
import { bigNumberify, defaultAbiCoder } from "ethers/utils";

import { ConditionalTransaction, SetStateCommitment } from "../ethereum";
import { Opcode, Protocol } from "../machine/enums";
import {
  Context,
  InstallVirtualAppParams,
  ProtocolExecutionFlow,
  ProtocolMessage
} from "../machine/types";
import { sortAddresses, xkeyKthAddress } from "../machine/xkeys";
import { AppInstance, StateChannel } from "../models";
import { getCreate2MultisigAddress } from "../utils";

import { UNASSIGNED_SEQ_NO } from "./utils/signature-forwarder";
import { assertIsValidSignature } from "./utils/signature-validator";

/**
 * As specified in TwoPartyFixedOutcomeFromVirtualAppETHInterpreter.sol,
 * "As"
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
    address[2] beneficiaries,
    address tokenAddress
  )
`;

export const encodeTwoPartyFixedOutcomeFromVirtualAppETHInterpreterParams = params =>
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
      network,
      provider
    } = context;

    const {
      intermediaryXpub,
      responderXpub
    } = params as InstallVirtualAppParams;

    const [
      stateChannelWithInitiatingAndIntermediary,
      stateChannelWithResponding,
      stateChannelWithIntermediary,
      virtualAppInstance,
      timeLockedPassThroughAppInstance
    ] = await getUpdatedStateChannelAndVirtualAppObjectsForInitiating(
      params as InstallVirtualAppParams,
      stateChannelsMap,
      network,
      provider
    );

    const intermediaryAddress = stateChannelWithIntermediary.getMultisigOwnerAddrOf(
      intermediaryXpub
    );

    const responderAddress = stateChannelWithResponding.getMultisigOwnerAddrOf(
      responderXpub
    );

    const presignedMultisigTxForAliceIngridVirtualAppAgreement = new ConditionalTransaction(
      network,
      stateChannelWithIntermediary.multisigAddress,
      stateChannelWithIntermediary.multisigOwners,
      timeLockedPassThroughAppInstance.identityHash,
      stateChannelWithIntermediary.freeBalance.identityHash,
      network.TwoPartyFixedOutcomeFromVirtualAppETHInterpreter,
      encodeTwoPartyFixedOutcomeFromVirtualAppETHInterpreterParams(
        stateChannelWithIntermediary.getSingleAssetTwoPartyIntermediaryAgreementFromVirtualApp(
          virtualAppInstance.identityHash
        )
      )
    );

    const initiatorSignatureOnAliceIngridVirtualAppAgreement = yield [
      Opcode.OP_SIGN,
      presignedMultisigTxForAliceIngridVirtualAppAgreement
    ];

    const m1 = {
      params, // Must include as this is the first message received by intermediary
      protocol,
      protocolExecutionID,
      toXpub: intermediaryXpub,
      seq: 1,
      signature: initiatorSignatureOnAliceIngridVirtualAppAgreement,
      // FIXME: We are abusing these typed parameters in the ProtocolMessage
      //        to pass through some variables from the initiating party
      //        to the intermediary party. To fix, we ought to have some
      //        kind of `metadata` fields on the ProtocolMessage
      signature2: virtualAppInstance.identityHash as unknown,
      signature3: timeLockedPassThroughAppInstance.state[
        "defaultOutcome"
      ] as unknown
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
      "intermediarySignatureOnAliceIngridVirtualAppAgreement"
    );

    // TODO: write to DB

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.InstallVirtualApp, // TODO: Figure out how to map this to save to DB correctly
      presignedMultisigTxForAliceIngridVirtualAppAgreement.getSignedTransaction(
        [
          initiatorSignatureOnAliceIngridVirtualAppAgreement,
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
      "intermediarySignatureOnAliceIngridFreeBalanceAppActivation"
    );

    // TODO: sign free balance app activation

    const initiatorSignatureOnAliceIngridFreeBalanceAppActivation = yield [
      Opcode.OP_SIGN,
      freeBalanceAliceIngridVirtualAppAgreementActivationCommitment
    ];

    // TODO: write to DB

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      freeBalanceAliceIngridVirtualAppAgreementActivationCommitment.getSignedTransaction(
        [
          initiatorSignatureOnAliceIngridFreeBalanceAppActivation,
          intermediarySignatureOnAliceIngridFreeBalanceAppActivation
        ]
      ),
      stateChannelWithIntermediary.freeBalance.identityHash
    ];

    // TODO: compute virtual app set state commitment

    const virtualAppSetStateCommitment = new SetStateCommitment(
      network,
      virtualAppInstance.identity,
      virtualAppInstance.hashOfLatestState,
      virtualAppInstance.versionNumber,
      virtualAppInstance.defaultTimeout
    );

    const timeLockedPassThroughSetStateCommitment = new SetStateCommitment(
      network,
      timeLockedPassThroughAppInstance.identity,
      timeLockedPassThroughAppInstance.hashOfLatestState,
      timeLockedPassThroughAppInstance.versionNumber,
      timeLockedPassThroughAppInstance.defaultTimeout
    );

    // TODO: sign virtual app set state commitment

    const initiatorSignatureOnTimeLockedPassThroughSetStateCommitment = yield [
      Opcode.OP_SIGN,
      timeLockedPassThroughSetStateCommitment
    ];

    const initiatorSignatureOnVirtualAppSetStateCommitment = yield [
      Opcode.OP_SIGN,
      virtualAppSetStateCommitment
    ];

    // TODO: send [ FB, VA ] to intermediary

    const m5 = {
      protocol,
      protocolExecutionID,
      toXpub: intermediaryXpub,
      seq: UNASSIGNED_SEQ_NO,
      signature: initiatorSignatureOnAliceIngridFreeBalanceAppActivation,
      signature2: initiatorSignatureOnTimeLockedPassThroughSetStateCommitment,
      signature3: initiatorSignatureOnVirtualAppSetStateCommitment
    } as ProtocolMessage;

    const m8 = yield [Opcode.IO_SEND_AND_WAIT, m5];

    const {
      signature: intermediarySignatureOnTimeLockedPassThroughSetStateCommitment,
      signature2: responderSignatureOnTimeLockedPassThroughSetStateCommitment,
      signature3: responderSignatureOnVirtualAppSetStateCommitment
    } = m8;

    // TODO: require(signatures on virtual app agreement are OK)

    assertIsValidSignature(
      intermediaryAddress,
      timeLockedPassThroughSetStateCommitment,
      intermediarySignatureOnTimeLockedPassThroughSetStateCommitment,
      "intermediarySignatureOnTimeLockedPassThroughSetStateCommitment"
    );

    assertIsValidSignature(
      responderAddress,
      timeLockedPassThroughSetStateCommitment,
      responderSignatureOnTimeLockedPassThroughSetStateCommitment,
      "responderSignatureOnTimeLockedPassThroughSetStateCommitment"
    );

    assertIsValidSignature(
      responderAddress,
      virtualAppSetStateCommitment,
      responderSignatureOnVirtualAppSetStateCommitment,
      "responderSignatureOnVirtualAppSetStateCommitment"
    );

    // TODO: Save to DB

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      timeLockedPassThroughSetStateCommitment.getSignedTransaction([
        initiatorSignatureOnTimeLockedPassThroughSetStateCommitment,
        responderSignatureOnTimeLockedPassThroughSetStateCommitment,
        intermediarySignatureOnTimeLockedPassThroughSetStateCommitment
      ]),
      timeLockedPassThroughAppInstance.identityHash
    ];

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      virtualAppSetStateCommitment.getSignedTransaction([
        initiatorSignatureOnVirtualAppSetStateCommitment,
        responderSignatureOnVirtualAppSetStateCommitment
      ]),
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

    context.stateChannelsMap.set(
      stateChannelWithInitiatingAndIntermediary.multisigAddress,
      stateChannelWithInitiatingAndIntermediary
    );
  },

  1 /* Intermediary */: async function*(context: Context) {
    const { message: m1, stateChannelsMap, network, provider } = context;

    const {
      params,
      protocolExecutionID,
      signature: initiatorSignatureOnAliceIngridVirtualAppAgreement,
      // FIXME: We are abusing these typed parameters in the ProtocolMessage
      //        to pass through some variables from the initiating party
      //        to the intermediary party. To fix, we ought to have some
      //        kind of `metadata` fields on the ProtocolMessage
      signature2: virtualAppInstanceIdentityHash,
      signature3: virtualAppInstanceDefaultOutcome
    } = m1;

    const { initiatorXpub, responderXpub } = params as InstallVirtualAppParams;

    const [
      stateChannelBetweenVirtualAppUsers,
      stateChannelWithInitiating,
      stateChannelWithResponding,
      timeLockedPassThroughAppInstance
    ] = await getUpdatedStateChannelAndVirtualAppObjectsForIntermediary(
      params as InstallVirtualAppParams,
      stateChannelsMap,
      (virtualAppInstanceIdentityHash as unknown) as string,
      (virtualAppInstanceDefaultOutcome as unknown) as string,
      network,
      provider
    );

    const initiatorAddress = stateChannelWithInitiating.getMultisigOwnerAddrOf(
      initiatorXpub
    );

    const responderAddress = stateChannelWithResponding.getMultisigOwnerAddrOf(
      responderXpub
    );

    // TODO: compute conditional transaction for the initiator party

    const presignedMultisigTxForAliceIngridVirtualAppAgreement = new ConditionalTransaction(
      network,
      stateChannelWithInitiating.multisigAddress,
      stateChannelWithInitiating.multisigOwners,
      timeLockedPassThroughAppInstance.identityHash,
      stateChannelWithInitiating.freeBalance.identityHash,
      network.TwoPartyFixedOutcomeFromVirtualAppETHInterpreter,
      encodeTwoPartyFixedOutcomeFromVirtualAppETHInterpreterParams(
        stateChannelWithInitiating.getSingleAssetTwoPartyIntermediaryAgreementFromVirtualApp(
          timeLockedPassThroughAppInstance.state["targetAppIdentityHash"]
        )
      )
    );

    // TODO: require(signature on conditional transaction is good from initiator)

    assertIsValidSignature(
      initiatorAddress,
      presignedMultisigTxForAliceIngridVirtualAppAgreement,
      initiatorSignatureOnAliceIngridVirtualAppAgreement,
      "initiatorSignatureOnAliceIngridVirtualAppAgreement"
    );

    // TODO: compute conditional transaction for the responder party

    const presignedMultisigTxForIngridBobVirtualAppAgreement = new ConditionalTransaction(
      network,
      stateChannelWithResponding.multisigAddress,
      stateChannelWithResponding.multisigOwners,
      timeLockedPassThroughAppInstance.identityHash,
      stateChannelWithResponding.freeBalance.identityHash,
      network.TwoPartyFixedOutcomeFromVirtualAppETHInterpreter,
      encodeTwoPartyFixedOutcomeFromVirtualAppETHInterpreterParams(
        stateChannelWithResponding.getSingleAssetTwoPartyIntermediaryAgreementFromVirtualApp(
          timeLockedPassThroughAppInstance.state["targetAppIdentityHash"]
        )
      )
    );

    // TODO: sign conditional transaction

    const intermediarySignatureOnIngridBobVirtualAppAgreement = yield [
      Opcode.OP_SIGN,
      presignedMultisigTxForIngridBobVirtualAppAgreement
    ];

    // TODO: send conditional transaction to responder

    const m2 = {
      params, // Must include as this is the first message received by responder
      protocol,
      protocolExecutionID,
      seq: 2,
      toXpub: responderXpub,
      signature: intermediarySignatureOnIngridBobVirtualAppAgreement
    } as ProtocolMessage;

    const m3 = yield [Opcode.IO_SEND_AND_WAIT, m2];

    const {
      signature: responderSignatureOnIngridBobVirtualAppAgreement,
      signature2: responderSignatureOnIngridBobFreeBalanceAppActivation
    } = m3;

    // TODO: require(signature on conditional transaction is good from responder

    assertIsValidSignature(
      responderAddress,
      presignedMultisigTxForIngridBobVirtualAppAgreement,
      responderSignatureOnIngridBobVirtualAppAgreement,
      "responderSignatureOnIngridBobVirtualAppAgreement"
    );

    // TODO: compute free balance activation from responder

    const freeBalanceIngridBobVirtualAppAgreementActivationCommitment = new SetStateCommitment(
      network,
      stateChannelWithResponding.freeBalance.identity,
      stateChannelWithResponding.freeBalance.hashOfLatestState,
      stateChannelWithResponding.freeBalance.versionNumber,
      stateChannelWithResponding.freeBalance.timeout
    );

    // TODO: require( signature on free balance app activation is good)

    assertIsValidSignature(
      responderAddress,
      freeBalanceIngridBobVirtualAppAgreementActivationCommitment,
      responderSignatureOnIngridBobFreeBalanceAppActivation,
      "responderSignatureOnIngridBobFreeBalanceAppActivation"
    );

    // TODO: compute free balance app activation for initiator

    const freeBalanceAliceIngridVirtualAppAgreementActivationCommitment = new SetStateCommitment(
      network,
      stateChannelWithInitiating.freeBalance.identity,
      stateChannelWithInitiating.freeBalance.hashOfLatestState,
      stateChannelWithInitiating.freeBalance.versionNumber,
      stateChannelWithInitiating.freeBalance.timeout
    );

    // TODO: sign free balance app activation commitment with initiator

    const intermediarySignatureOnAliceIngridFreeBalanceAppActivation = yield [
      Opcode.OP_SIGN,
      freeBalanceAliceIngridVirtualAppAgreementActivationCommitment
    ];

    // TODO: sign conditional transaction for initiator

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
          initiatorSignatureOnAliceIngridVirtualAppAgreement,
          intermediarySignatureOnAliceIngridVirtualAppAgreement
        ]
      ),
      timeLockedPassThroughAppInstance.identityHash
    ];

    // TODO: send [ CT, FB ] to initiator

    const m4 = {
      protocol,
      protocolExecutionID,
      seq: UNASSIGNED_SEQ_NO,
      toXpub: initiatorXpub,
      signature: intermediarySignatureOnAliceIngridVirtualAppAgreement,
      signature2: intermediarySignatureOnAliceIngridFreeBalanceAppActivation
    } as ProtocolMessage;

    const m5 = yield [Opcode.IO_SEND_AND_WAIT, m4];

    const {
      signature: initiatorSignatureOnAliceIngridFreeBalanceAppActivation,
      signature2: initiatorSignatureOnTimeLockedPassThroughSetStateCommitment,
      signature3: initiatorSignatureOnVirtualAppSetStateCommitment
    } = m5;

    // TODO: require(signature on free balance activation with initiaitng is good)

    assertIsValidSignature(
      initiatorAddress,
      freeBalanceAliceIngridVirtualAppAgreementActivationCommitment,
      initiatorSignatureOnAliceIngridFreeBalanceAppActivation,
      "initiatorSignatureOnAliceIngridFreeBalanceAppActivation"
    );

    // TODO: write to db

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      freeBalanceIngridBobVirtualAppAgreementActivationCommitment.getSignedTransaction(
        [
          initiatorSignatureOnAliceIngridFreeBalanceAppActivation,
          intermediarySignatureOnAliceIngridFreeBalanceAppActivation
        ]
      ),
      stateChannelWithResponding.freeBalance.identityHash
    ];

    // TODO: compute virtual app set state commitment

    const timeLockedPassThroughSetStateCommitment = new SetStateCommitment(
      network,
      timeLockedPassThroughAppInstance.identity,
      timeLockedPassThroughAppInstance.hashOfLatestState,
      timeLockedPassThroughAppInstance.versionNumber,
      timeLockedPassThroughAppInstance.defaultTimeout
    );

    // TODO: require(signature on virtual app set state from initiaitng is good)

    assertIsValidSignature(
      initiatorAddress,
      timeLockedPassThroughSetStateCommitment,
      initiatorSignatureOnTimeLockedPassThroughSetStateCommitment,
      "initiatorSignatureOnTimeLockedPassThroughSetStateCommitment"
    );

    // TODO: sign free balance update with responder

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
          responderSignatureOnIngridBobFreeBalanceAppActivation,
          intermediarySignatureOnIngridBobFreeBalanceAppActivation
        ]
      ),
      stateChannelWithResponding.freeBalance.identityHash
    ];

    // TODO: sign virtual app set state

    const intermediarySignatureOnTimeLockedPassThroughSetStateCommitment = yield [
      Opcode.OP_SIGN,
      timeLockedPassThroughSetStateCommitment
    ];

    // TODO: send [ FB, VA ] to responder

    const m6 = {
      protocol,
      protocolExecutionID,
      toXpub: responderXpub,
      seq: UNASSIGNED_SEQ_NO,
      signature: intermediarySignatureOnIngridBobFreeBalanceAppActivation,
      signature2: intermediarySignatureOnTimeLockedPassThroughSetStateCommitment,
      signature3: initiatorSignatureOnTimeLockedPassThroughSetStateCommitment,
      signature4: initiatorSignatureOnVirtualAppSetStateCommitment
    } as ProtocolMessage;

    const m7 = yield [Opcode.IO_SEND_AND_WAIT, m6];

    const {
      signature: responderSignatureOnTimeLockedPassThroughSetStateCommitment,
      signature2: responderSignatureOnVirtualAppSetStateCommitment
    } = m7;

    // TODO: require virtual app set state is good from responder

    assertIsValidSignature(
      responderAddress,
      timeLockedPassThroughSetStateCommitment,
      responderSignatureOnTimeLockedPassThroughSetStateCommitment,
      "responderSignatureOnTimeLockedPassThroughSetStateCommitment"
    );

    // TODO: write to DB

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      timeLockedPassThroughSetStateCommitment.getSignedTransaction([
        initiatorSignatureOnTimeLockedPassThroughSetStateCommitment,
        responderSignatureOnTimeLockedPassThroughSetStateCommitment,
        intermediarySignatureOnTimeLockedPassThroughSetStateCommitment
      ]),
      timeLockedPassThroughAppInstance.identityHash
    ];

    // TODO: forward the virtual app set state to the initiator

    const m8 = {
      protocol,
      protocolExecutionID,
      toXpub: initiatorXpub,
      seq: UNASSIGNED_SEQ_NO,
      signature: intermediarySignatureOnTimeLockedPassThroughSetStateCommitment,
      signature2: responderSignatureOnTimeLockedPassThroughSetStateCommitment,
      signature3: responderSignatureOnVirtualAppSetStateCommitment
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
    const { message: m2, stateChannelsMap, network, provider } = context;

    const {
      params,
      protocolExecutionID,
      signature: intermediarySignatureOnIngridBobVirtualAppAgreement
    } = m2;

    const {
      intermediaryXpub,
      initiatorXpub
    } = params as InstallVirtualAppParams;

    const [
      stateChannelWithRespondingAndIntermediary,
      stateChannelWithInitiating,
      stateChannelWithIntermediary,
      virtualAppInstance,
      timeLockedPassThroughAppInstance
    ] = await getUpdatedStateChannelAndVirtualAppObjectsForResponding(
      params as InstallVirtualAppParams,
      stateChannelsMap,
      network,
      provider
    );

    const intermediaryAddress = stateChannelWithIntermediary.getMultisigOwnerAddrOf(
      intermediaryXpub
    );

    const initiatorAddress = stateChannelWithInitiating.getMultisigOwnerAddrOf(
      initiatorXpub
    );

    // TODO: compute conditional transaction for the intermeidary party

    const presignedMultisigTxForIngridBobVirtualAppAgreement = new ConditionalTransaction(
      network,
      stateChannelWithIntermediary.multisigAddress,
      stateChannelWithIntermediary.multisigOwners,
      timeLockedPassThroughAppInstance.identityHash,
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
      "intermediarySignatureOnIngridBobVirtualAppAgreement"
    );

    // TODO: sign conditional transaction

    const responderSignatureOnIngridBobVirtualAppAgreement = yield [
      Opcode.OP_SIGN,
      presignedMultisigTxForIngridBobVirtualAppAgreement
    ];

    // TODO: write to DB

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.InstallVirtualApp, // TODO: Figure out how to map this to save to DB correctly
      presignedMultisigTxForIngridBobVirtualAppAgreement.getSignedTransaction([
        responderSignatureOnIngridBobVirtualAppAgreement,
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

    const responderSignatureOnIngridBobFreeBalanceAppActivation = yield [
      Opcode.OP_SIGN,
      freeBalanceIngridBobVirtualAppAgreementActivationCommitment
    ];

    // TODO: send free balance app activation and conditional transaction countersig to intermediary

    const m3 = {
      protocol,
      protocolExecutionID,
      toXpub: intermediaryXpub,
      seq: UNASSIGNED_SEQ_NO,
      signature: responderSignatureOnIngridBobVirtualAppAgreement,
      signature2: responderSignatureOnIngridBobFreeBalanceAppActivation
    } as ProtocolMessage;

    const m6 = yield [Opcode.IO_SEND_AND_WAIT, m3];

    const {
      signature: intermediarySignatureOnIngridBobFreeBalanceAppActivation,
      signature2: intermediarySignatureOnTimeLockedPassThroughSetStateCommitment,
      signature3: initiatorSignatureOnTimeLockedPassThroughSetStateCommitment,
      signature4: initiatorSignatureOnVirtualAppSetStateCommitment
    } = m6;

    // TODO: require(signature on free balance app activation is good

    assertIsValidSignature(
      intermediaryAddress,
      freeBalanceIngridBobVirtualAppAgreementActivationCommitment,
      intermediarySignatureOnIngridBobFreeBalanceAppActivation,
      "intermediarySignatureOnIngridBobFreeBalanceAppActivation"
    );

    // TODO: write to DB

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      freeBalanceIngridBobVirtualAppAgreementActivationCommitment.getSignedTransaction(
        [
          intermediarySignatureOnIngridBobFreeBalanceAppActivation,
          responderSignatureOnIngridBobFreeBalanceAppActivation
        ]
      ),
      stateChannelWithIntermediary.freeBalance.identityHash
    ];

    // TODO: compute virtual app set state commitment

    const virtualAppSetStateCommitment = new SetStateCommitment(
      network,
      virtualAppInstance.identity,
      virtualAppInstance.hashOfLatestState,
      virtualAppInstance.versionNumber,
      virtualAppInstance.defaultTimeout
    );

    const timeLockedPassThroughSetStateCommitment = new SetStateCommitment(
      network,
      timeLockedPassThroughAppInstance.identity,
      timeLockedPassThroughAppInstance.hashOfLatestState,
      timeLockedPassThroughAppInstance.versionNumber,
      timeLockedPassThroughAppInstance.defaultTimeout
    );

    // TODO: require virtual app set state commitment sigs by intermediary and initiaitng are good

    assertIsValidSignature(
      intermediaryAddress,
      timeLockedPassThroughSetStateCommitment,
      intermediarySignatureOnTimeLockedPassThroughSetStateCommitment,
      "intermediarySignatureOnTimeLockedPassThroughSetStateCommitment"
    );

    assertIsValidSignature(
      initiatorAddress,
      timeLockedPassThroughSetStateCommitment,
      initiatorSignatureOnTimeLockedPassThroughSetStateCommitment,
      "initiatorSignatureOnTimeLockedPassThroughSetStateCommitment"
    );

    assertIsValidSignature(
      initiatorAddress,
      virtualAppSetStateCommitment,
      initiatorSignatureOnVirtualAppSetStateCommitment,
      "initiatorSignatureOnVirtualAppSetStateCommitment"
    );

    // TODO: sign virtual app set state commitment balance app activation

    const responderSignatureOnTimeLockedPassThroughSetStateCommitment = yield [
      Opcode.OP_SIGN,
      timeLockedPassThroughSetStateCommitment
    ];

    const responderSignatureOnVirtualAppSetStateCommitment = yield [
      Opcode.OP_SIGN,
      virtualAppSetStateCommitment
    ];

    // TODO: write to DB

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      timeLockedPassThroughSetStateCommitment.getSignedTransaction([
        initiatorSignatureOnTimeLockedPassThroughSetStateCommitment,
        responderSignatureOnTimeLockedPassThroughSetStateCommitment,
        intermediarySignatureOnTimeLockedPassThroughSetStateCommitment
      ]),
      timeLockedPassThroughAppInstance.identityHash
    ];

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Update,
      virtualAppSetStateCommitment.getSignedTransaction([
        initiatorSignatureOnVirtualAppSetStateCommitment,
        responderSignatureOnVirtualAppSetStateCommitment
      ]),
      virtualAppInstance.identityHash
    ];

    // TODO: send [ VA ] to intermediary

    const m7 = {
      protocol,
      protocolExecutionID,
      toXpub: intermediaryXpub,
      seq: UNASSIGNED_SEQ_NO,
      signature: responderSignatureOnTimeLockedPassThroughSetStateCommitment,
      signature2: responderSignatureOnVirtualAppSetStateCommitment
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

    context.stateChannelsMap.set(
      stateChannelWithRespondingAndIntermediary.multisigAddress,
      stateChannelWithRespondingAndIntermediary
    );
  }
};

/**
 * Creates a shared AppInstance that represents the Virtual App being installed.
 *
 * NOTE: There is NO interpreter for this AppInstance since nothing interprets the outcome
 *       except for a TimeLockedPassThrough AppInstance that uses it inside of its own
 *       computeOutcome function.
 *
 * @param {StateChannel} stateChannelBetweenEndpoints - The StateChannel object between the endpoints
 * @param {InstallVirtualAppParams} params - Parameters of the new App to be installed
 *
 * @returns {AppInstance} an AppInstance with the correct metadata
 */
function constructVirtualAppInstance(
  stateChannelBetweenEndpoints: StateChannel,
  params: InstallVirtualAppParams
): AppInstance {
  const {
    initiatorXpub,
    responderXpub,
    defaultTimeout,
    appInterface,
    initialState
  } = params;

  const seqNo = stateChannelBetweenEndpoints.numInstalledApps;

  const initiatorAddress = xkeyKthAddress(initiatorXpub, seqNo);
  const responderAddress = xkeyKthAddress(responderXpub, seqNo);

  return new AppInstance(
    /* multisigAddress */ stateChannelBetweenEndpoints.multisigAddress,
    /* signingKeys */
    [initiatorAddress, responderAddress],
    /* defaultTimeout */ defaultTimeout,
    /* appInterface */ appInterface,
    /* isVirtualApp */ true,
    /* appSeqNo */ seqNo,
    /* initialState */ initialState,
    /* versionNumber */ 0,
    /* latestTimeout */ defaultTimeout,
    /* twoPartyOutcomeInterpreterParams */ undefined,
    /* coinTransferInterpreterParams */ undefined
  );
}

/**
 * Creates a shared AppInstance that represents the AppInstance whose outcome
 * determines how any VirtualAppAgreements play out. It depends on a VirtualApp.
 *
 * NOTE: This AppInstance is currently HARD-CODED to only work with interpreters
 *       that can understand the TwoPartyFixedOutcome outcome type. Currently
 *       we use the TwoPartyFixedOutcomeFromVirtualAppETHInterpreter for all
 *       commitments between users and intermediaries to handle Virtual Apps.
 *
 * @param {StateChannel} threePartyStateChannel - The StateChannel object with all 3
 *        participants of this protocol as the owner-set.
 *
 * @param {InstallVirtualAppParams} params - Parameters of the new App to be installed
 *
 * @returns {AppInstance} an AppInstance with the correct metadata
 */
function constructTimeLockedPassThroughAppInstance(
  threePartyStateChannel: StateChannel,
  virtualAppInstanceIdentityHash: string,
  virtualAppDefaultOutcome: string,
  network: NetworkContext,
  params: InstallVirtualAppParams,
  provider: BaseProvider
): AppInstance {
  const {
    intermediaryXpub,
    initiatorXpub,
    responderXpub,
    initiatorBalanceDecrement,
    responderBalanceDecrement,
    outcomeType
  } = params;

  const seqNo = threePartyStateChannel.numInstalledApps;

  const intermediaryAddress = xkeyKthAddress(intermediaryXpub, seqNo);
  const initiatorAddress = xkeyKthAddress(initiatorXpub, seqNo);
  const responderAddress = xkeyKthAddress(responderXpub, seqNo);

  const HARD_CODED_CHALLENGE_TIMEOUT = 100;

  return new AppInstance(
    /* multisigAddress */ AddressZero,
    /* signingKeys */
    sortAddresses([initiatorAddress, responderAddress, intermediaryAddress]),
    /* defaultTimeout */ HARD_CODED_CHALLENGE_TIMEOUT,
    /* appInterface */ {
      stateEncoding: `
        tuple(
          address challengeRegistryAddress,
          bytes32 targetAppIdentityHash,
          uint256 switchesOutcomeAt,
          bytes defaultOutcome
        )
      `,
      actionEncoding: undefined,
      addr: network.TimeLockedPassThrough
    },
    /* isVirtualApp */ true,
    /* appSeqNo */ seqNo,
    {
      challengeRegistryAddress: network.ChallengeRegistry,
      targetAppIdentityHash: virtualAppInstanceIdentityHash,
      switchesOutcomeAt: Zero,
      defaultOutcome: virtualAppDefaultOutcome
    },
    /* versionNumber */ 0,
    /* latestTimeout */ HARD_CODED_CHALLENGE_TIMEOUT,
    /* outcomeType */ outcomeType,
    /* twoPartyOutcomeInterpreterParams */
    {
      playerAddrs: [initiatorAddress, responderAddress],
      amount: bigNumberify(initiatorBalanceDecrement).add(
        responderBalanceDecrement
      )
    },
    /* coinTransferInterpreterParams */ undefined
  );
}

/**
 * Gets a StateChannel between the two endpoint users. It may not already exist, in which
 * case it constructs a StateChannel object to be used.
 *
 * Note that this method has the "getOrCreate" prefix because if this is the _first_
 * time that a virtual app is instantiated between these counterparties that goes
 * through this intermediary then the `StateChannel` will not exist in the stateChannelsMap
 * of any of the participants so it needs to be created. If, however, this is not the first
 * time then there will be an object in the stateChannelsMap that can be fetched by using
 * the unique identifier for the wrapper StateChannel.
 *
 * @param {Map<string, StateChannel>} stateChannelsMap - map of StateChannels to query
 * @param {[string, string]} userXpubs - List of users
 * @param {NetworkContext} network - Metadata on the current blockchain
 *
 * @returns {StateChannel} - a stateChannelWithAllThreeParties
 */
function getOrCreateStateChannelWithUsers(
  stateChannelsMap: Map<string, StateChannel>,
  userXpubs: string[],
  network: NetworkContext
): StateChannel {
  const multisigAddress = getCreate2MultisigAddress(
    userXpubs,
    network.ProxyFactory,
    network.MinimumViableMultisig
  );

  return (
    stateChannelsMap.get(multisigAddress) ||
    StateChannel.createEmptyChannel(multisigAddress, userXpubs)
  );
}

async function getUpdatedStateChannelAndVirtualAppObjectsForInitiating(
  params: InstallVirtualAppParams,
  stateChannelsMap: Map<string, StateChannel>,
  network: NetworkContext,
  provider: BaseProvider
): Promise<
  [StateChannel, StateChannel, StateChannel, AppInstance, AppInstance]
> {
  const {
    initiatorBalanceDecrement,
    responderBalanceDecrement,
    tokenAddress,
    initiatorXpub,
    intermediaryXpub,
    responderXpub
  } = params as InstallVirtualAppParams;

  const stateChannelWithAllThreeParties = getOrCreateStateChannelWithUsers(
    stateChannelsMap,
    [initiatorXpub, responderXpub, intermediaryXpub],
    network
  );

  const stateChannelWithResponding = getOrCreateStateChannelWithUsers(
    stateChannelsMap,
    [initiatorXpub, responderXpub],
    network
  );

  const virtualAppInstance = constructVirtualAppInstance(
    stateChannelWithResponding,
    params
  );

  const timeLockedPassThroughAppInstance = await constructTimeLockedPassThroughAppInstance(
    stateChannelWithAllThreeParties,
    virtualAppInstance.identityHash,
    await virtualAppInstance.computeOutcome(virtualAppInstance.state, provider),
    network,
    params,
    provider
  );

  const initiatorAddress = xkeyKthAddress(initiatorXpub, 0);
  const intermediaryAddress = xkeyKthAddress(intermediaryXpub, 0);

  const stateChannelWithIntermediary = stateChannelsMap.get(
    getCreate2MultisigAddress(
      [initiatorXpub, intermediaryXpub],
      network.ProxyFactory,
      network.MinimumViableMultisig
    )
  );

  if (!stateChannelWithIntermediary) {
    throw Error(
      "Cannot run InstallVirtualAppProtocol without existing channel with intermediary"
    );
  }

  const newStateChannelWithIntermediary = stateChannelWithIntermediary.addSingleAssetTwoPartyIntermediaryAgreement(
    virtualAppInstance.identityHash,
    {
      tokenAddress,
      timeLockedPassThroughIdentityHash:
        timeLockedPassThroughAppInstance.identityHash,
      expiryBlock: 100_000_000_000,
      capitalProvided: bigNumberify(initiatorBalanceDecrement).add(
        responderBalanceDecrement
      ),
      beneficiaries: [initiatorAddress, intermediaryAddress]
    },
    {
      [initiatorAddress]: initiatorBalanceDecrement,
      [intermediaryAddress]: responderBalanceDecrement
    },
    tokenAddress
  );

  return [
    stateChannelWithAllThreeParties.addAppInstance(
      timeLockedPassThroughAppInstance
    ),
    stateChannelWithResponding.addAppInstance(virtualAppInstance),
    newStateChannelWithIntermediary,
    virtualAppInstance,
    timeLockedPassThroughAppInstance
  ];
}

async function getUpdatedStateChannelAndVirtualAppObjectsForIntermediary(
  params: InstallVirtualAppParams,
  stateChannelsMap: Map<string, StateChannel>,
  virtualAppInstanceIdentityHash: string,
  virtualAppInstanceDefaultOutcome: string,
  network: NetworkContext,
  provider: BaseProvider
): Promise<[StateChannel, StateChannel, StateChannel, AppInstance]> {
  const {
    initiatorBalanceDecrement,
    responderBalanceDecrement,
    initiatorXpub,
    intermediaryXpub,
    responderXpub,
    tokenAddress
  } = params as InstallVirtualAppParams;

  const stateChannelWithAllThreeParties = getOrCreateStateChannelWithUsers(
    stateChannelsMap,
    [initiatorXpub, responderXpub, intermediaryXpub],
    network
  );

  const timeLockedPassThroughAppInstance = await constructTimeLockedPassThroughAppInstance(
    stateChannelWithAllThreeParties,
    virtualAppInstanceIdentityHash,
    virtualAppInstanceDefaultOutcome,
    network,
    params,
    provider
  );

  const channelWithInitiating = stateChannelsMap.get(
    getCreate2MultisigAddress(
      [initiatorXpub, intermediaryXpub],
      network.ProxyFactory,
      network.MinimumViableMultisig
    )
  );

  if (!channelWithInitiating) {
    throw Error(
      "Cannot mediate InstallVirtualAppProtocol without mediation channel to initiator"
    );
  }

  const channelWithResponding = stateChannelsMap.get(
    getCreate2MultisigAddress(
      [responderXpub, intermediaryXpub],
      network.ProxyFactory,
      network.MinimumViableMultisig
    )
  );

  if (!channelWithResponding) {
    throw Error(
      "Cannot mediate InstallVirtualAppProtocol without mediation channel to responder"
    );
  }

  const initiatorAddress = xkeyKthAddress(initiatorXpub, 0);
  const intermediaryAddress = xkeyKthAddress(intermediaryXpub, 0);
  const responderAddress = xkeyKthAddress(responderXpub, 0);

  return [
    stateChannelWithAllThreeParties.addAppInstance(
      timeLockedPassThroughAppInstance
    ),

    channelWithInitiating.addSingleAssetTwoPartyIntermediaryAgreement(
      virtualAppInstanceIdentityHash,
      {
        tokenAddress,
        timeLockedPassThroughIdentityHash:
          timeLockedPassThroughAppInstance.identityHash,
        expiryBlock: 100_000_000_000,
        capitalProvided: bigNumberify(initiatorBalanceDecrement).add(
          responderBalanceDecrement
        ),
        beneficiaries: [initiatorAddress, intermediaryAddress]
      },
      {
        [initiatorAddress]: initiatorBalanceDecrement,
        [intermediaryAddress]: responderBalanceDecrement
      },
      tokenAddress
    ),

    channelWithResponding.addSingleAssetTwoPartyIntermediaryAgreement(
      virtualAppInstanceIdentityHash,
      {
        tokenAddress,
        timeLockedPassThroughIdentityHash:
          timeLockedPassThroughAppInstance.identityHash,
        expiryBlock: 100_000_000_000,
        capitalProvided: bigNumberify(initiatorBalanceDecrement).add(
          responderBalanceDecrement
        ),
        beneficiaries: [intermediaryAddress, responderAddress]
      },
      {
        [intermediaryAddress]: initiatorBalanceDecrement,
        [responderAddress]: responderBalanceDecrement
      },
      tokenAddress
    ),

    timeLockedPassThroughAppInstance
  ];
}

async function getUpdatedStateChannelAndVirtualAppObjectsForResponding(
  params: InstallVirtualAppParams,
  stateChannelsMap: Map<string, StateChannel>,
  network: NetworkContext,
  provider: BaseProvider
): Promise<
  [StateChannel, StateChannel, StateChannel, AppInstance, AppInstance]
> {
  const {
    initiatorBalanceDecrement,
    responderBalanceDecrement,
    initiatorXpub,
    intermediaryXpub,
    responderXpub,
    tokenAddress
  } = params as InstallVirtualAppParams;

  const stateChannelWithAllThreeParties = getOrCreateStateChannelWithUsers(
    stateChannelsMap,
    [initiatorXpub, responderXpub, intermediaryXpub],
    network
  );

  const stateChannelWithInitiating = getOrCreateStateChannelWithUsers(
    stateChannelsMap,
    [initiatorXpub, responderXpub],
    network
  );

  const virtualAppInstance = constructVirtualAppInstance(
    stateChannelWithInitiating,
    params
  );

  const timeLockedPassThroughAppInstance = await constructTimeLockedPassThroughAppInstance(
    stateChannelWithAllThreeParties,
    virtualAppInstance.identityHash,
    await virtualAppInstance.computeOutcome(virtualAppInstance.state, provider),
    network,
    params,
    provider
  );

  const stateChannelWithIntermediary = stateChannelsMap.get(
    getCreate2MultisigAddress(
      [responderXpub, intermediaryXpub],
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
  const responderAddress = xkeyKthAddress(responderXpub, 0);

  return [
    stateChannelWithAllThreeParties.addAppInstance(
      timeLockedPassThroughAppInstance
    ),

    stateChannelWithInitiating.addAppInstance(virtualAppInstance),

    stateChannelWithIntermediary.addSingleAssetTwoPartyIntermediaryAgreement(
      virtualAppInstance.identityHash,
      {
        tokenAddress,
        timeLockedPassThroughIdentityHash:
          timeLockedPassThroughAppInstance.identityHash,
        expiryBlock: 100_000_000_000,
        capitalProvided: bigNumberify(initiatorBalanceDecrement).add(
          responderBalanceDecrement
        ),
        beneficiaries: [intermediaryAddress, responderAddress]
      },
      {
        [intermediaryAddress]: initiatorBalanceDecrement,
        [responderAddress]: responderBalanceDecrement
      },
      tokenAddress
    ),

    virtualAppInstance,

    timeLockedPassThroughAppInstance
  ];
}
