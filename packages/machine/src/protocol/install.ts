import { AssetType, NetworkContext } from "@counterfactual/types";

import { ProtocolExecutionFlow } from "..";
import { Opcode, Protocol } from "../enums";
import { InstallCommitment } from "../ethereum";
import { AppInstance, StateChannel } from "../models";
import { Context, InstallParams, ProtocolParameters } from "../types";
import { xkeyKthAddress } from "../xkeys";

import { UNASSIGNED_SEQ_NO } from "./utils/signature-forwarder";
import { validateSignature } from "./utils/signature-validator";

/**
 * @description This exchange is described at the following URL:
 *
 * specs.counterfactual.com/05-install-protocol#messages
 */
export const INSTALL_PROTOCOL: ProtocolExecutionFlow = {
  0: async function*(context: Context) {
    const { respondingXpub } = context.message.params;
    const respondingAddress = xkeyKthAddress(respondingXpub, 0);

    const [appIdentityHash, commitment] = proposeStateTransition(
      context.message.params,
      context
    );

    const mySig = yield [Opcode.OP_SIGN, commitment];

    const { signature: theirSig } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        ...context.message,
        toXpub: respondingXpub,
        signature: mySig,
        seq: 1
      }
    ];

    validateSignature(respondingAddress, commitment, theirSig);
    const finalCommitment = commitment.transaction([mySig, theirSig]);
    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Install,
      finalCommitment,
      appIdentityHash
    ];
  },

  1: async function*(context: Context) {
    const { initiatingXpub } = context.message.params;
    const initiatingAddress = xkeyKthAddress(initiatingXpub, 0);

    const [appIdentityHash, commitment] = proposeStateTransition(
      context.message.params,
      context
    );

    const theirSig = context.message.signature!;
    validateSignature(initiatingAddress, commitment, theirSig);

    const mySig = yield [Opcode.OP_SIGN, commitment];

    const finalCommitment = commitment.transaction([mySig, theirSig]);
    yield [
      Opcode.WRITE_COMMITMENT,
      Protocol.Install,
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

function proposeStateTransition(
  params: ProtocolParameters,
  context: Context
): [string, InstallCommitment] {
  const {
    aliceBalanceDecrement,
    bobBalanceDecrement,
    signingKeys,
    initialState,
    terms,
    appInterface,
    defaultTimeout,
    multisigAddress
  } = params as InstallParams;

  const stateChannel = context.stateChannelsMap.get(multisigAddress)!;

  const appInstance = new AppInstance(
    multisigAddress,
    signingKeys,
    defaultTimeout,
    appInterface,
    terms,
    // KEY: Sets it to NOT be a virtual app
    false,
    // KEY: The app sequence number
    stateChannel.numInstalledApps,
    stateChannel.rootNonceValue,
    initialState,
    // KEY: Set the nonce to be 0
    0,
    defaultTimeout
  );

  const newStateChannel = stateChannel.installApp(
    appInstance,
    aliceBalanceDecrement,
    bobBalanceDecrement
  );
  context.stateChannelsMap.set(multisigAddress, newStateChannel);

  const appIdentityHash = appInstance.identityHash;

  const commitment = constructInstallOp(
    context.network,
    newStateChannel,
    appIdentityHash
  );

  return [appIdentityHash, commitment];
}

function constructInstallOp(
  network: NetworkContext,
  stateChannel: StateChannel,
  appIdentityHash: string
) {
  const app = stateChannel.getAppInstance(appIdentityHash);

  const freeBalance = stateChannel.getFreeBalanceFor(AssetType.ETH);

  return new InstallCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    app.identity,
    app.terms,
    freeBalance.identity,
    freeBalance.terms,
    freeBalance.hashOfLatestState,
    freeBalance.nonce,
    freeBalance.timeout,
    app.appSeqNo,
    freeBalance.rootNonceValue
  );
}
