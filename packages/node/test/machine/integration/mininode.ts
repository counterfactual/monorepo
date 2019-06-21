import { NetworkContext } from "@counterfactual/types";
import { JsonRpcProvider } from "ethers/providers";
import { SigningKey } from "ethers/utils";
import { HDNode } from "ethers/utils/hdnode";

import { EthereumCommitment } from "../../../src/ethereum/types";
import {
  AppInstanceProtocolContext,
  DirectChannelProtocolContext,
  InstructionExecutor,
  Opcode,
  Protocol,
  ProtocolMessage,
  TakeActionParams,
  UpdateParams,
  VirtualChannelIntermediaryProtocolContext,
  VirtualChannelProtocolContext
} from "../../../src/machine";
import { StateChannel } from "../../../src/models";

import { getRandomHDNodes } from "./random-signing-keys";

/// Returns a function that can be registered with IO_SEND{_AND_WAIT}
const makeSigner = (hdNode: HDNode, asIntermediary: boolean) => {
  return async (args: [EthereumCommitment] | [EthereumCommitment, number]) => {
    if (args.length !== 1 && args.length !== 2) {
      throw Error("OP_SIGN middleware received wrong number of arguments.");
    }

    const [commitment, overrideKeyIndex] = args;

    const keyIndex = overrideKeyIndex || 0;

    const signingKey = new SigningKey(
      hdNode.derivePath(`${keyIndex}`).privateKey
    );

    return signingKey.signDigest(commitment.hashToSign(asIntermediary));
  };
};

export class MiniNode {
  private readonly hdNode: HDNode;
  public readonly ie: InstructionExecutor;
  public scm: Map<string, StateChannel>;
  public readonly xpub: string;

  constructor(
    readonly networkContext: NetworkContext,
    readonly provider: JsonRpcProvider
  ) {
    [this.hdNode] = getRandomHDNodes(1);

    this.xpub = this.hdNode.neuter().extendedKey;

    this.scm = new Map<string, StateChannel>();

    this.ie = new InstructionExecutor(networkContext, provider);

    this.ie.register(Opcode.OP_SIGN, makeSigner(this.hdNode, false));

    this.ie.register(
      Opcode.OP_SIGN_AS_INTERMEDIARY,
      makeSigner(this.hdNode, true)
    );

    this.ie.register(Opcode.WRITE_COMMITMENT, () => {});
  }

  public async dispatchMessage(message: ProtocolMessage) {
    const ret = await this.ie.runProtocolWithMessage(message, this.scm);

    if ([Protocol.Update, Protocol.TakeAction].includes(message.protocol)) {
      const { multisigAddress } = message.params as
        | UpdateParams
        | TakeActionParams;

      const { appInstance } = ret as AppInstanceProtocolContext;

      this.scm = this.scm.set(
        multisigAddress,
        this.scm
          .get(multisigAddress)!
          .setState(appInstance.identityHash, appInstance.state)
      );

      return;
    }

    if (
      [
        Protocol.Setup,
        Protocol.Install,
        Protocol.Uninstall,
        Protocol.Withdraw
      ].includes(message.protocol)
    ) {
      const { stateChannel } = ret as DirectChannelProtocolContext;
      this.scm = this.scm.set(stateChannel.multisigAddress, stateChannel);
      return;
    }

    if (
      [Protocol.InstallVirtualApp, Protocol.UninstallVirtualApp].includes(
        message.protocol
      )
    ) {
      if (message.seq === 1) {
        const {
          stateChannelWithInitiating,
          stateChannelWithResponding,
          stateChannelWithCounterparty
        } = ret as VirtualChannelIntermediaryProtocolContext;
        this.scm = this.scm
          .set(
            stateChannelWithInitiating.multisigAddress,
            stateChannelWithInitiating
          )
          .set(
            stateChannelWithResponding.multisigAddress,
            stateChannelWithResponding
          )
          .set(
            stateChannelWithCounterparty!.multisigAddress,
            stateChannelWithCounterparty!
          );
        return;
      }

      if (message.seq === 2) {
        const {
          stateChannelWithIntermediary,
          stateChannelWithCounterparty
        } = ret as VirtualChannelProtocolContext;
        this.scm = this.scm
          .set(
            stateChannelWithIntermediary.multisigAddress,
            stateChannelWithIntermediary
          )
          .set(
            stateChannelWithCounterparty.multisigAddress,
            stateChannelWithCounterparty
          );
        return;
      }
    }
  }
}
