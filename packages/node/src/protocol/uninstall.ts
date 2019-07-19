import { BaseProvider } from "ethers/providers";

import { SetStateCommitment } from "../ethereum";
import { Opcode, Protocol } from "../machine/enums";
import {
  Context,
  ProtocolExecutionFlow,
  ProtocolMessage,
  ProtocolParameters,
  UninstallParams
} from "../machine/types";
import { xkeyKthAddress } from "../machine/xkeys";
import { StateChannel } from "../models";

import { computeTokenIndexedFreeBalanceIncrements } from "./utils/get-outcome-increments";
import { UNASSIGNED_SEQ_NO } from "./utils/signature-forwarder";
import { assertIsValidSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/06-uninstall-protocol#messages
 */
export const UNINSTALL_PROTOCOL: ProtocolExecutionFlow = {
  0: async function*(context: Context) {
    const { responderXpub } = context.message.params;
    const responderAddress = xkeyKthAddress(responderXpub, 0);

    const [uninstallCommitment, appIdentityHash] = await proposeStateTransition(
      context.message.params,
      context,
      context.provider
    );

    const mySig = yield [Opcode.OP_SIGN, uninstallCommitment];

    const { signature: theirSig } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        protocol: Protocol.Uninstall,
        protocolExecutionID: context.message.protocolExecutionID,
        params: context.message.params,
        toXpub: responderXpub,
        signature: mySig,
        seq: 1
      } as ProtocolMessage
    ];

    assertIsValidSignature(responderAddress, uninstallCommitment, theirSig);

    const finalCommitment = uninstallCommitment.getSignedTransaction([
      mySig,
      theirSig
    ]);

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Uninstall,
      finalCommitment,
      appIdentityHash
    ];
  },
  1: async function*(context: Context) {
    const { initiatorXpub } = context.message.params;
    const initiatorAddress = xkeyKthAddress(initiatorXpub, 0);

    const [uninstallCommitment, appIdentityHash] = await proposeStateTransition(
      context.message.params,
      context,
      context.provider
    );

    const theirSig = context.message.signature!;

    assertIsValidSignature(initiatorAddress, uninstallCommitment, theirSig);

    const mySig = yield [Opcode.OP_SIGN, uninstallCommitment];

    const finalCommitment = uninstallCommitment.getSignedTransaction([
      mySig,
      theirSig
    ]);

    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Uninstall,
      finalCommitment,
      appIdentityHash
    ];

    yield [
      Opcode.IO_SEND,
      {
        protocol: Protocol.Uninstall,
        protocolExecutionID: context.message.protocolExecutionID,
        toXpub: initiatorXpub,
        signature: mySig,
        seq: UNASSIGNED_SEQ_NO
      } as ProtocolMessage
    ];
  }
};

async function proposeStateTransition(
  params: ProtocolParameters,
  context: Context,
  provider: BaseProvider
): Promise<[SetStateCommitment, string]> {
  const { appIdentityHash, multisigAddress } = params as UninstallParams;

  const { network, stateChannelsMap } = context;

  const sc = stateChannelsMap.get(multisigAddress) as StateChannel;

  const tokenIndexedIncrements = await computeTokenIndexedFreeBalanceIncrements(
    network,
    sc,
    appIdentityHash,
    provider
  );

  const newStateChannel = sc.uninstallApp(
    appIdentityHash,
    tokenIndexedIncrements
  );

  stateChannelsMap.set(multisigAddress, newStateChannel);

  const freeBalance = newStateChannel.freeBalance;

  const uninstallCommitment = new SetStateCommitment(
    context.network,
    freeBalance.identity,
    freeBalance.hashOfLatestState,
    freeBalance.versionNumber,
    freeBalance.timeout
  );

  return [uninstallCommitment, appIdentityHash];
}
