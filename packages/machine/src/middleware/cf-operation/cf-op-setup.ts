import ConditionalTransactionJson from "@counterfactual/contracts/build/contracts/ConditionalTransaction.json";
import * as ethers from "ethers";

import * as abi from "../../abi";

import { Address } from "../../types";
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

export class CfOpSetup extends CfMultiSendOp {
  /**
   * Helper method to get hash of an input calldata
   * @param multisig
   * @param multisigInput
   */
  public constructor(
    readonly networkContext: NetworkContext,
    readonly multisig: Address,
    readonly freeBalanceStateChannel: CfAppInstance,
    readonly freeBalance: CfFreeBalance,
    readonly dependencyNonce: CfNonce
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
    const terms = CfFreeBalance.terms();

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
