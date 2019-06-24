import { NetworkContext, OutcomeType } from "@counterfactual/types";
import { BigNumber, bigNumberify, defaultAbiCoder } from "ethers/utils";

import { InstallCommitment } from "../ethereum";
import { ProtocolExecutionFlow } from "../machine";
import { Opcode, Protocol } from "../machine/enums";
import {
  Context,
  InstallParams,
  ProtocolMessage,
  ProtocolParameters
} from "../machine/types";
import { xkeyKthAddress } from "../machine/xkeys";
import { AppInstance, StateChannel } from "../models";

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

    const [appIdentityHash, commitment] = await proposeStateTransition(
      context.message.params,
      context
    );

    const mySig = yield [Opcode.OP_SIGN, commitment];

    const { signature: theirSig } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        protocol: Protocol.Install,
        protocolExecutionID: context.message.protocolExecutionID,
        params: context.message.params,
        toXpub: respondingXpub,
        signature: mySig,
        seq: 1
      } as ProtocolMessage
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

    const [appIdentityHash, commitment] = await proposeStateTransition(
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
        protocol: Protocol.Install,
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
  context: Context
): Promise<[string, InstallCommitment]> {
  const {
    initiatingBalanceDecrement,
    respondingBalanceDecrement,
    initiatingXpub,
    respondingXpub,
    signingKeys,
    initialState,
    appInterface,
    defaultTimeout,
    multisigAddress,
    outcomeType
  } = params as InstallParams;

  const stateChannel = context.stateChannelsMap.get(multisigAddress)!;

  const initiatingFbAddress = xkeyKthAddress(initiatingXpub, 0);
  const respondingFbAddress = xkeyKthAddress(respondingXpub, 0);

  let interpreterAddress: string;
  let interpreterParams: string;

  let coinTransferInterpreterParams:
    | {
        // Derived from:
        // packages/contracts/contracts/interpreters/ETHInterpreter.sol#L18
        limit: BigNumber;
      }
    | undefined;

  let twoPartyOutcomeInterpreterParams:
    | {
        // Derived from:
        // packages/contracts/contracts/interpreters/TwoPartyEthAsLump.sol#L10
        playerAddrs: [string, string];
        amount: BigNumber;
      }
    | undefined;

  switch (outcomeType) {
    case OutcomeType.COIN_TRANSFER: {
      coinTransferInterpreterParams = {
        limit: bigNumberify(initiatingBalanceDecrement).add(
          respondingBalanceDecrement
        )
      };
      interpreterAddress = context.network.ETHInterpreter;
      interpreterParams = defaultAbiCoder.encode(
        ["tuple(uint256 limit)"],
        [coinTransferInterpreterParams]
      );
      break;
    }
    case OutcomeType.TWO_PARTY_FIXED_OUTCOME: {
      twoPartyOutcomeInterpreterParams = {
        playerAddrs: [initiatingFbAddress, respondingFbAddress],
        amount: bigNumberify(initiatingBalanceDecrement).add(
          respondingBalanceDecrement
        )
      };
      interpreterAddress = context.network.TwoPartyEthAsLump;
      interpreterParams = defaultAbiCoder.encode(
        ["tuple(address[2] playerAddrs, uint256 amount)"],
        [twoPartyOutcomeInterpreterParams]
      );
      break;
    }
    default: {
      throw new Error(
        "The outcome type in this application logic contract is not supported yet."
      );
    }
  }

  const appInstance = new AppInstance(
    /* multisigAddress */ multisigAddress,
    /* signingKeys */ signingKeys,
    /* defaultTimeout */ defaultTimeout,
    /* appInterface */ appInterface,
    /* isVirtualApp */ false,
    /* appSeqNo */ stateChannel.numInstalledApps,
    /* rootNonceValue */ stateChannel.rootNonceValue,
    /* latestState */ initialState,
    /* latestversionNumber */ 0,
    /* defaultTimeout */ defaultTimeout,
    /* twoPartyOutcomeInterpreterParams */ twoPartyOutcomeInterpreterParams,
    /* coinTransferInterpreterParams */ coinTransferInterpreterParams
  );

  const newStateChannel = stateChannel.installApp(appInstance, {
    [initiatingFbAddress]: initiatingBalanceDecrement,
    [respondingFbAddress]: respondingBalanceDecrement
  });

  context.stateChannelsMap.set(multisigAddress, newStateChannel);

  const appIdentityHash = appInstance.identityHash;

  const commitment = constructInstallOp(
    context.network,
    newStateChannel,
    appIdentityHash,
    interpreterAddress,
    interpreterParams
  );

  return [appIdentityHash, commitment];
}

function constructInstallOp(
  network: NetworkContext,
  stateChannel: StateChannel,
  appIdentityHash: string,
  interpreterAddress: string,
  interpreterParams: string
) {
  const app = stateChannel.getAppInstance(appIdentityHash);

  const freeBalance = stateChannel.freeBalance;

  return new InstallCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    app.identity,
    freeBalance.identity,
    freeBalance.hashOfLatestState,
    freeBalance.versionNumber,
    freeBalance.timeout,
    app.appSeqNo,
    freeBalance.rootNonceValue,
    interpreterAddress,
    interpreterParams
  );
}
