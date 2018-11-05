import ConditionalTransactionJson from "@counterfactual/contracts/build/contracts/ConditionalTransaction.json";
import * as ethers from "ethers";

import * as abi from "../../abi";

import { Address, H256 } from "../../types";
import { NetworkContext } from "../../utils/network-context";

import { CfMultiSendOp } from "./cf-multisend-op";
import {
  CfAppInstance,
  CfFreeBalance,
  CfNonce,
  MultisigInput,
  Operation
} from "./types";

const { keccak256 } = ethers.utils;

export class CfOpInstall extends CfMultiSendOp {
  constructor(
    readonly networkContext: NetworkContext,
    readonly multisig: Address,
    readonly app: CfAppInstance,
    readonly cfFreeBalance: CfFreeBalance,
    readonly dependencyNonce: CfNonce,
    readonly rootNonceKey: string,
    readonly rootNonceKeyExpectedValue: number
  ) {
    super(networkContext, multisig, cfFreeBalance, dependencyNonce);
  }

  /**
   * @override common.CfMultiSendOp
   */
  public eachMultisigInput(): MultisigInput[] {
    return [this.freeBalanceInput(), this.conditionalTransactionInput()];
  }

  private conditionalTransactionInput(): MultisigInput {
    const to = this.networkContext.conditionalTransactionAddr;
    const val = 0;
    const terms = [
      this.app.terms.assetType,
      this.app.terms.limit,
      this.app.terms.token
    ];
    const uninstallKey = keccak256(
      abi.encodePacked(
        ["address", "uint256", "uint256"],
        [this.multisig, 0, this.dependencyNonce.salt]
      )
    );
    const data = new ethers.utils.Interface(
      ConditionalTransactionJson.abi
    ).functions.executeAppConditionalTransaction.encode([
      this.networkContext.registryAddr,
      this.networkContext.nonceRegistryAddr,
      uninstallKey,
      this.rootNonceKey,
      this.rootNonceKeyExpectedValue,
      this.appCfAddress,
      terms
    ]);
    const op = Operation.Delegatecall;
    return new MultisigInput(to, val, data, op);
  }

  get appCfAddress(): H256 {
    return this.app.cfAddress();
  }
}
