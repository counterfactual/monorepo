import * as cf from "@counterfactual/cf.js";

import { MultiSendOp } from "./multi-send-op";
import { MultisigInput } from "./types";

export class OpUninstall extends MultiSendOp {
  constructor(
    readonly networkContext: cf.legacy.network.NetworkContext,
    readonly multisig: cf.legacy.utils.Address,
    readonly freeBalance: cf.legacy.utils.FreeBalance,
    readonly dependencyNonce: cf.legacy.utils.Nonce
  ) {
    super(networkContext, multisig, freeBalance, dependencyNonce);
  }

  /**
   * @override common.MultiSendOp
   */
  public eachMultisigInput(): MultisigInput[] {
    return [this.freeBalanceInput(), this.dependencyNonceInput()];
  }
}
