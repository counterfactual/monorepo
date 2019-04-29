import { NetworkContext } from "@counterfactual/types";
import { JsonRpcProvider } from "ethers/providers";
import { SigningKey } from "ethers/utils";
import { HDNode } from "ethers/utils/hdnode";

import { EthereumCommitment } from "../../../src/ethereum/types";
import {
  InstructionExecutor,
  Opcode,
  StateChannel
} from "../../../src/machine";

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

  public async dispatchMessage(message: any) {
    this.scm = await this.ie.runProtocolWithMessage(message, this.scm);
  }
}
