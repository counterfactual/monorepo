import * as cf from "@counterfactual/cf.js";
import ConditionalTransactionJson from "@counterfactual/contracts/build/contracts/ConditionalTransaction.json";
import * as ethers from "ethers";

import { CfMultiSendOp } from "./cf-multisend-op";

import { MultisigInput, Operation } from "./types";

const { keccak256 } = ethers.utils;
const { abi } = cf.utils;

export class CfOpSetup extends CfMultiSendOp {
  /**
   * Helper method to get hash of an input calldata
   * @param multisig
   * @param multisigInput
   */
  public constructor(
    readonly networkContext: cf.utils.NetworkContext,
    readonly multisig: cf.utils.Address,
    readonly freeBalanceStateChannel: cf.app.AppInstance,
    readonly freeBalance: cf.utils.CfFreeBalance,
    readonly dependencyNonce: cf.utils.Nonce
  ) {
    super(networkContext, multisig, freeBalance, dependencyNonce);
    if (dependencyNonce === undefined) {
      throw new Error("Undefined dependency nonce");
    }
  }

  /**
   * @override common.CfMultiSendOp
   */
  public eachMultisigInput(): MultisigInput[] {
    return [this.conditionalTransactionInput()];
  }

  public conditionalTransactionInput(): MultisigInput {
    const terms = cf.utils.CfFreeBalance.terms();

    const uninstallKey = keccak256(
      abi.encodePacked(
        ["address", "uint256", "uint256"],
        [this.multisig, 0, this.dependencyNonce.salt]
      )
    );

    const multisigCalldata = new ethers.utils.Interface(
      ConditionalTransactionJson.abi
    ).functions.executeAppConditionalTransaction.encode([
      this.networkContext.registryAddr,
      this.networkContext.nonceRegistryAddr,
      uninstallKey,
      this.freeBalanceStateChannel.cfAddress(),
      [terms.assetType, terms.limit, terms.token]
    ]);

    return new MultisigInput(
      this.networkContext.conditionalTransactionAddr,
      0,
      multisigCalldata,
      Operation.Delegatecall
    );
  }
}
