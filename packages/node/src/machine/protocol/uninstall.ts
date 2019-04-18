import { AssetType, ETHBucketAppState } from "@counterfactual/types";
import { BaseProvider } from "ethers/providers";

import { Protocol, ProtocolExecutionFlow } from "..";
import { Opcode } from "../enums";
import { UninstallCommitment } from "../ethereum";
import { StateChannel } from "../models";
import { Context, ProtocolParameters, UninstallParams } from "../types";
import { xkeyKthAddress } from "../xkeys";

import {
  computeFreeBalanceIncrements,
  getAliceBobMap
} from "./utils/get-resolution-increments";
import { UNASSIGNED_SEQ_NO } from "./utils/signature-forwarder";
import { validateSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/06-uninstall-protocol#messages
 */
export const UNINSTALL_PROTOCOL: ProtocolExecutionFlow = {
  0: async function*(context: Context) {
    const { respondingXpub } = context.message.params;
    const respondingAddress = xkeyKthAddress(respondingXpub, 0);

    const [uninstallCommitment, appIdentityHash] = await proposeStateTransition(
      context.message.params,
      context,
      context.provider
    );
    const mySig = yield [Opcode.OP_SIGN, uninstallCommitment];

    const { signature: theirSig } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        ...context.message,
        toXpub: respondingXpub,
        signature: mySig,
        seq: 1
      }
    ];

    validateSignature(respondingAddress, uninstallCommitment, theirSig);
    const finalCommitment = uninstallCommitment.transaction([mySig, theirSig]);
    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Uninstall,
      finalCommitment,
      appIdentityHash
    ];
  },
  1: async function*(context: Context) {
    const { initiatingXpub } = context.message.params;
    const initiatingAddress = xkeyKthAddress(initiatingXpub, 0);

    const [uninstallCommitment, appIdentityHash] = await proposeStateTransition(
      context.message.params,
      context,
      context.provider
    );

    const theirSig = context.message.signature!;
    validateSignature(initiatingAddress, uninstallCommitment, theirSig);

    const mySig = yield [Opcode.OP_SIGN, uninstallCommitment];

    const finalCommitment = uninstallCommitment.transaction([mySig, theirSig]);
    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Uninstall,
      finalCommitment,
      appIdentityHash
    ];

    yield [
      Opcode.IO_SEND,
      {
        ...context.message,
        toXpub: initiatingXpub,
        signature: mySig,
        seq: UNASSIGNED_SEQ_NO
      }
    ];
  }
};

async function proposeStateTransition(
  params: ProtocolParameters,
  context: Context,
  provider: BaseProvider
): Promise<[UninstallCommitment, string]> {
  const { appIdentityHash, multisigAddress } = params as UninstallParams;
  const { network, stateChannelsMap } = context;

  const sc = stateChannelsMap.get(multisigAddress) as StateChannel;

  const sequenceNo = sc.getAppInstance(appIdentityHash).appSeqNo;

  const increments = await computeFreeBalanceIncrements(
    sc,
    appIdentityHash,
    provider
  );

  const aliceBobMap = getAliceBobMap(sc);

  const newStateChannel = sc.uninstallApp(
    appIdentityHash,
    increments[aliceBobMap.alice],
    increments[aliceBobMap.bob]
  );

  stateChannelsMap.set(multisigAddress, newStateChannel);

  const freeBalance = newStateChannel.getFreeBalanceFor(AssetType.ETH);

  const uninstallCommitment = new UninstallCommitment(
    network,
    newStateChannel.multisigAddress,
    newStateChannel.multisigOwners,
    freeBalance.identity,
    freeBalance.terms,
    freeBalance.state as ETHBucketAppState,
    freeBalance.nonce,
    freeBalance.timeout,
    sequenceNo
  );

  return [uninstallCommitment, appIdentityHash];
}
