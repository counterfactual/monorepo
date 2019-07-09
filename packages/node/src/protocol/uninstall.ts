import { BaseProvider } from "ethers/providers";

import { UninstallCommitment } from "../ethereum";
import { Protocol, ProtocolExecutionFlow } from "../machine";
import { Opcode } from "../machine/enums";
import {
  Context,
  ProtocolMessage,
  ProtocolParameters,
  UninstallParams
} from "../machine/types";
import { xkeyKthAddress } from "../machine/xkeys";
import { StateChannel } from "../models";
import {
  CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  FreeBalanceState
} from "../models/free-balance";

import { computeFreeBalanceIncrements } from "./utils/get-outcome-increments";
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
        protocol: Protocol.Uninstall,
        protocolExecutionID: context.message.protocolExecutionID,
        params: context.message.params,
        toXpub: respondingXpub,
        signature: mySig,
        seq: 1
      } as ProtocolMessage
    ];

    validateSignature(respondingAddress, uninstallCommitment, theirSig);

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
        toXpub: initiatingXpub,
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
): Promise<[UninstallCommitment, string]> {
  const {
    appIdentityHash,
    multisigAddress,
    tokenAddress
  } = params as UninstallParams;
  const { network, stateChannelsMap } = context;

  const sc = stateChannelsMap.get(multisigAddress) as StateChannel;

  const sequenceNo = sc.getAppInstance(appIdentityHash).appSeqNo;

  const increments = await computeFreeBalanceIncrements(
    network,
    sc,
    appIdentityHash,
    provider
  );

  const newStateChannel = sc.uninstallApp(
    appIdentityHash,
    increments,
    // installing/uninstalling apps with ERC20 is not yet supported
    // so all installs/uninstalls default to ETH
    tokenAddress ? tokenAddress : CONVENTION_FOR_ETH_TOKEN_ADDRESS
  );

  stateChannelsMap.set(multisigAddress, newStateChannel);

  const freeBalance = newStateChannel.freeBalance;

  const uninstallCommitment = new UninstallCommitment(
    network,
    newStateChannel.multisigAddress,
    newStateChannel.multisigOwners,
    freeBalance.identity,
    (freeBalance.state as unknown) as FreeBalanceState,
    freeBalance.versionNumber,
    freeBalance.timeout,
    sequenceNo
  );

  return [uninstallCommitment, appIdentityHash];
}
