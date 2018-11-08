import * as cf from "@counterfactual/cf.js";

import { MultiSendOp } from "./multi-send-op";
import { MultisigInput } from "./types";

export class OpUninstall extends MultiSendOp {
  constructor(
    readonly networkContext: cf.utils.NetworkContext,
    readonly multisig: cf.utils.Address,
    readonly cfFreeBalance: cf.utils.FreeBalance,
    readonly dependencyNonce: cf.utils.Nonce
  ) {
    super(networkContext, multisig, cfFreeBalance, dependencyNonce);
  }

  /**
   * @override common.MultiSendOp
   */
  public eachMultisigInput(): MultisigInput[] {
    return [this.freeBalanceInput(), this.dependencyNonceInput()];
  }
}
