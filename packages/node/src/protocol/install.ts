import CounterfactualApp from "@counterfactual/contracts/build/CounterfactualApp.json";
import { AssetType, NetworkContext, OutcomeType } from "@counterfactual/types";
import { Contract } from "ethers";
import { BigNumber, bigNumberify, defaultAbiCoder } from "ethers/utils";

import { InstallCommitment } from "../ethereum";
import { ProtocolExecutionFlow } from "../machine";
import { Opcode, Protocol } from "../machine/enums";
import { Context, InstallParams, ProtocolParameters } from "../machine/types";
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
    multisigAddress
  } = params as InstallParams;

  const appDefinition = new Contract(
    appInterface.addr,
    CounterfactualApp.abi,
    context.provider
  );

  const outcomeType = (await appDefinition.functions.outcomeType()) as BigNumber;

  let interpreterAddress: string;

  switch (outcomeType.toNumber()) {
    case OutcomeType.ETH_TRANSFER: {
      interpreterAddress = context.network.ETHInterpreter;
      break;
    }
    case OutcomeType.TWO_PARTY_OUTCOME: {
      interpreterAddress = context.network.TwoPartyEthAsLump;
      break;
    }
    default: {
      throw Error("unrecognized");
    }
  }

  const stateChannel = context.stateChannelsMap.get(multisigAddress)!;

  const initiatingFbAddress = xkeyKthAddress(initiatingXpub, 0);
  const respondingFbAddress = xkeyKthAddress(respondingXpub, 0);

  const appInstance = new AppInstance(
    /* multisigAddress */ multisigAddress,
    /* signingKeys */ signingKeys,
    /* defaultTimeout */ defaultTimeout,
    /* appInterface */ appInterface,
    /* isVirtualApp */ false,
    /* appSeqNo */ stateChannel.numInstalledApps,
    /* rootNonceValue */ stateChannel.rootNonceValue,
    /* latestState */ initialState,
    /* latestNonce */ 0,
    /* defaultTimeout */ defaultTimeout,
    /* beneficiaries */ [initiatingFbAddress, respondingFbAddress],
    /* limitOrTotal */ bigNumberify(initiatingBalanceDecrement).add(
      respondingBalanceDecrement
    )
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
    interpreterAddress
  );

  return [appIdentityHash, commitment];
}

function constructInstallOp(
  network: NetworkContext,
  stateChannel: StateChannel,
  appIdentityHash: string,
  interpreterAddress
) {
  const app = stateChannel.getAppInstance(appIdentityHash);

  const freeBalance = stateChannel.getFreeBalanceFor(AssetType.ETH);

  return new InstallCommitment(
    network,
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    app.identity,
    freeBalance.identity,
    freeBalance.hashOfLatestState,
    freeBalance.nonce,
    freeBalance.timeout,
    app.appSeqNo,
    freeBalance.rootNonceValue,
    interpreterAddress,
    defaultAbiCoder.encode(["uint256"], [app.limitOrTotal])
  );
}
