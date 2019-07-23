import { bigNumberify, BigNumberish } from "ethers/utils";

import { MultisigCommitment } from "./multisig-commitment";
import { MultisigOperation, MultisigTransaction } from "./types";

export class WithdrawETHCommitment extends MultisigCommitment {
  public constructor(
    public readonly multisigAddress: string,
    public readonly multisigOwners: string[],
    public readonly to: string,
    public readonly value: BigNumberish
  ) {
    super(multisigAddress, multisigOwners);
  }

  public getTransactionDetails(): MultisigTransaction {
    return {
      to: this.to,
      value: bigNumberify(this.value),
      data: "0x",
      operation: MultisigOperation.Call
    };
  }
}
