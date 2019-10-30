import { BaseProvider } from "ethers/providers";

import { UNASSIGNED_SEQ_NO } from "../constants";
import { SetStateCommitment } from "../ethereum";
import { xkeyKthAddress } from "../machine";
import { Opcode, Protocol } from "../machine/enums";
import {
  Context,
  ProtocolExecutionFlow,
  ProtocolMessage,
  UninstallParams
} from "../machine/types";
import { StateChannel, StateChannelJSON } from "../models";

import { computeTokenIndexedFreeBalanceIncrements } from "./utils/get-outcome-increments";
import { assertIsValidSignature } from "./utils/signature-validator";

const protocol = Protocol.Uninstall;
const { OP_SIGN, IO_SEND, IO_SEND_AND_WAIT } = Opcode;

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/06-uninstall-protocol#messages
 */
export const UNINSTALL_PROTOCOL: ProtocolExecutionFlow = {
  0 /* Initiating */: async function*(context: Context) {
    const { message, provider, store, network } = context;
    const {
      sharedData: { stateChannelsMap }
    } = store;
    const { params, processID } = message;
    const { responderXpub, appIdentityHash } = params as UninstallParams;

    const responderAddress = xkeyKthAddress(responderXpub, 0);

    const postProtocolStateChannel = await computeStateTransition(
      params as UninstallParams,
      stateChannelsMap,
      provider
    );

    const uninstallCommitment = new SetStateCommitment(
      network,
      postProtocolStateChannel.freeBalance.identity,
      postProtocolStateChannel.freeBalance.hashOfLatestState,
      postProtocolStateChannel.freeBalance.versionNumber,
      postProtocolStateChannel.freeBalance.timeout
    );

    const signature = yield [OP_SIGN, uninstallCommitment];

    const {
      customData: { signature: responderSignature }
    } = yield [
      IO_SEND_AND_WAIT,
      {
        protocol,
        processID,
        params,
        toXpub: responderXpub,
        customData: { signature },
        seq: 1
      } as ProtocolMessage
    ];

    assertIsValidSignature(
      responderAddress,
      uninstallCommitment,
      responderSignature
    );

    const finalCommitment = uninstallCommitment.getSignedTransaction([
      signature,
      responderSignature
    ]);

    await store.setCommitment([protocol, appIdentityHash], finalCommitment);

    await store.saveStateChannel(postProtocolStateChannel);
  },

  1 /* Responding */: async function*(context: Context) {
    const { message, provider, store, network } = context;
    const {
      sharedData: { stateChannelsMap }
    } = store;
    const { params, processID } = message;
    const { initiatorXpub, appIdentityHash } = params as UninstallParams;

    const initiatorAddress = xkeyKthAddress(initiatorXpub, 0);

    const postProtocolStateChannel = await computeStateTransition(
      params as UninstallParams,
      stateChannelsMap,
      provider
    );

    const uninstallCommitment = new SetStateCommitment(
      network,
      postProtocolStateChannel.freeBalance.identity,
      postProtocolStateChannel.freeBalance.hashOfLatestState,
      postProtocolStateChannel.freeBalance.versionNumber,
      postProtocolStateChannel.freeBalance.timeout
    );

    const initiatorSignature = context.message.customData.signature;

    assertIsValidSignature(
      initiatorAddress,
      uninstallCommitment,
      initiatorSignature
    );

    const responderSignature = yield [OP_SIGN, uninstallCommitment];

    const finalCommitment = uninstallCommitment.getSignedTransaction([
      responderSignature,
      initiatorSignature
    ]);

    await store.setCommitment([protocol, appIdentityHash], finalCommitment);

    await store.saveStateChannel(postProtocolStateChannel);

    yield [
      IO_SEND,
      {
        protocol,
        processID,
        toXpub: initiatorXpub,
        seq: UNASSIGNED_SEQ_NO,
        customData: {
          signature: responderSignature
        }
      } as ProtocolMessage
    ];
  }
};

async function computeStateTransition(
  params: UninstallParams,
  stateChannelsMap: { [multisigAddress: string]: StateChannelJSON },
  provider: BaseProvider
) {
  const { appIdentityHash, multisigAddress } = params;
  const stateChannel = StateChannel.fromJson(stateChannelsMap[multisigAddress]);
  return stateChannel.uninstallApp(
    appIdentityHash,
    await computeTokenIndexedFreeBalanceIncrements(
      stateChannel.getAppInstance(appIdentityHash),
      provider
    )
  );
}
