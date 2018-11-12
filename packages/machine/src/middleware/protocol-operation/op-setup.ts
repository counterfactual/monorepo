import * as cf from "@counterfactual/cf.js";
import ConditionalTransactionJson from "@counterfactual/contracts/build/contracts/ConditionalTransaction.json";
import { ethers } from "ethers";

import { MultisigTxOp } from "./multisig-tx-op";
import { MultisigInput, Operation } from "./types";

const { keccak256 } = ethers.utils;
const { abi } = cf.utils;

export class OpSetup extends MultisigTxOp {
  public constructor(
    readonly networkContext: cf.network.NetworkContext,
    readonly multisig: cf.utils.Address,
    readonly freeBalanceStateChannel: cf.app.AppInstance,
    readonly freeBalance: cf.utils.FreeBalance,
    readonly dependencyNonce: cf.utils.Nonce
  ) {
    super(multisig, freeBalance);
    if (dependencyNonce === undefined) {
      throw new Error("Undefined dependency nonce");
    }
  }

  multisigInput(): MultisigInput {
    const terms = cf.utils.FreeBalance.terms();

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
