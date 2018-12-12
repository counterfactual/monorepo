import * as cf from "@counterfactual/cf.js";
import ETHVirtualAppAgreementJson from "@counterfactual/contracts/build/contracts/ETHVirtualAppAgreement.json";
import { ethers } from "ethers";

import { MultiSendOp } from "./multi-send-op";
import { MultisigInput, Operation } from "./types";

export class OpInstallVirtualAppAgreement extends MultiSendOp {
  constructor(
    readonly networkContext: cf.legacy.network.NetworkContext,
    readonly multisig: cf.legacy.utils.Address,
    readonly app: cf.legacy.app.AppInstance,
    readonly freeBalance: cf.legacy.utils.FreeBalance,
    readonly uninstallationNonce: cf.legacy.utils.Nonce,
    readonly beneficiaries: cf.legacy.utils.Address[],
    readonly expiry: number
  ) {
    super(networkContext, multisig, freeBalance, uninstallationNonce);
  }

  /**
   * @override common.MultiSendOp
   */
  public eachMultisigInput(): MultisigInput[] {
    return [this.freeBalanceInput(), this.virtualAppAgreementInput()];
  }

  private virtualAppAgreementInput(): MultisigInput {
    const to = this.networkContext.ethVirtualAppAgreementAddr;
    const val = 0;
    const data = new ethers.utils.Interface(
      ETHVirtualAppAgreementJson.abi
    ).functions.delegateTarget.encode([
      {
        terms: {
          assetType: 0,
          limit: 0,
          token: 0
        },
        registry: this.networkContext.registryAddr,
        expiry: this.expiry,
        target: this.appCfAddress,
        capitalProvided: 0,
        beneficiaries: this.beneficiaries
      }
    ]);
    const op = Operation.Delegatecall;
    return new MultisigInput(to, val, data, op);
  }

  get appCfAddress(): cf.legacy.utils.H256 {
    return this.app.cfAddress();
  }
}
