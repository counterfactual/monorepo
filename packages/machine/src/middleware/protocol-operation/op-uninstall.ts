import { AppIdentity, Terms } from "@counterfactual/types";

import { MultiSendOp } from "./multi-send-op";
import { MultisigInput } from "./types";

export class OpUninstall extends MultiSendOp {
  constructor(
    readonly networkContext: any,
    readonly multisig: string,
    readonly multisigOwners: string[],
    readonly freeBalanceAppIdentity: AppIdentity,
    readonly freeBalanceTerms: Terms,
    readonly freeBalanceStateHash: string,
    readonly freeBalanceNonce: number,
    readonly freeBalanceTimeout: number,
    readonly dependencyNonceSalt: string,
    readonly dependencyNonceValue: number
  ) {
    super(
      networkContext,
      multisig,
      multisigOwners,
      freeBalanceAppIdentity,
      freeBalanceTerms,
      freeBalanceStateHash,
      freeBalanceNonce,
      freeBalanceTimeout,
      dependencyNonceSalt,
      dependencyNonceValue
    );
  }

  public eachMultisigInput(): MultisigInput[] {
    return [this.freeBalanceInput(), this.dependencyNonceInput()];
  }
}
