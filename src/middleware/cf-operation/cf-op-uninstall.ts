import { Address, NetworkContext } from "../../types";
import { CfMultiSendOp } from "./cf-multisend-op";
import { CfFreeBalance, CfNonce, MultisigInput } from "./types";

export class CfOpUninstall extends CfMultiSendOp {
  constructor(
    readonly ctx: NetworkContext,
    readonly multisig: Address,
    readonly cfFreeBalance: CfFreeBalance,
    readonly dependencyNonce: CfNonce
  ) {
    super(ctx, multisig, cfFreeBalance, dependencyNonce);
  }

  /**
   * @override common.CfMultiSendOp
   */
  public eachMultisigInput(): MultisigInput[] {
    return [this.freeBalanceInput(), this.dependencyNonceInput()];
  }
}
