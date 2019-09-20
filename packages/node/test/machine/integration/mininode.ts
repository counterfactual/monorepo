import { NetworkContext } from "@counterfactual/types";
import { JsonRpcProvider } from "ethers/providers";
import { SigningKey } from "ethers/utils";
import { HDNode } from "ethers/utils/hdnode";

import { EthereumCommitment } from "../../../src/ethereum/types";
import { Engine, Opcode } from "../../../src/machine";
import { StateChannel } from "../../../src/models";

import { getRandomHDNodes } from "./random-signing-keys";

/// Returns a function that can be registered with IO_SEND{_AND_WAIT}
const makeSigner = (hdNode: HDNode) => {
  return async (args: [EthereumCommitment] | [EthereumCommitment, number]) => {
    if (args.length !== 1 && args.length !== 2) {
      throw Error("OP_SIGN middleware received wrong number of arguments.");
    }

    const [commitment, overrideKeyIndex] = args;
    const keyIndex = overrideKeyIndex || 0;

    const signingKey = new SigningKey(
      hdNode.derivePath(`${keyIndex}`).privateKey
    );

    return signingKey.signDigest(commitment.hashToSign());
  };
};

export class MiniNode {
  private readonly hdNode: HDNode;
  public readonly engine: Engine;
  public scm: Map<string, StateChannel>;
  public readonly xpub: string;

  constructor(
    readonly networkContext: NetworkContext,
    readonly provider: JsonRpcProvider
  ) {
    [this.hdNode] = getRandomHDNodes(1);
    this.xpub = this.hdNode.neuter().extendedKey;
    this.scm = new Map<string, StateChannel>();
    this.engine = new Engine(networkContext, provider);
    this.engine.register(Opcode.OP_SIGN, makeSigner(this.hdNode));
    this.engine.register(Opcode.WRITE_COMMITMENT, () => {});
    this.engine.register(Opcode.PERSIST_STATE_CHANNEL, () => {});
    this.engine.register(Opcode.IO_SEND_FIN, () => {});
    this.engine.register(Opcode.IO_WAIT, () => {});
  }

  public async dispatchMessage(message: any) {
    this.scm = await this.engine.runProtocolWithMessage(message, this.scm);
  }
}
