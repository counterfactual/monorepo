import * as cf from "@counterfactual/cf.js";
import VirtualAppAgreementJson from "@counterfactual/contracts/build/contracts/VirtualAppAgreement.json";
import { ethers } from "ethers";

import { MultiSendOp } from "./multi-send-op";
import { MultisigInput, Operation } from "./types";

// const { keccak256 } = ethers.utils;
// const { abi } = cf.utils;

export class OpInstallVirtualAppAgreement extends MultiSendOp {
  constructor(
    readonly networkContext: cf.legacy.network.NetworkContext,
    readonly multisig: cf.legacy.utils.Address,
    readonly app: cf.legacy.app.AppInstance,
    readonly freeBalance: cf.legacy.utils.FreeBalance,
    readonly uninstallationNonce: cf.legacy.utils.Nonce
  ) {
    super(networkContext, multisig, freeBalance, uninstallationNonce);
  }

  /**
   * @override common.MultiSendOp
   */
  public eachMultisigInput(): MultisigInput[] {
    return [this.freeBalanceInput(), this.conditionalTransactionInput()];
  }

  private conditionalTransactionInput(): MultisigInput {
    const to = this.networkContext.virtualAppAgreementAddr;
    const val = 0;
    const terms = [
      this.app.terms.assetType,
      this.app.terms.limit,
      this.app.terms.token
    ];
    // const uninstallKey = keccak256(
    //   abi.encodePacked(
    //     ["address", "uint256", "uint256"],
    //     [this.multisig, 0, this.uninstallationNonce.salt]
    //   )
    // );
    const data = new ethers.utils.Interface(
      VirtualAppAgreementJson.abi
    ).functions.delegateTarget.encode([{
      registryAddr: this.networkContext.registryAddr,
      terms: terms,
      expiry: 0,
      target: this.appCfAddress,
      capitalProvided: 0,
      beneficiaries: [],
    }]);
    const op = Operation.Delegatecall;
    return new MultisigInput(to, val, data, op);
  }

  get appCfAddress(): cf.legacy.utils.H256 {
    return this.app.cfAddress();
  }
}
