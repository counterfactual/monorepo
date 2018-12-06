import * as cf from "@counterfactual/cf.js";
import StateChannelTransaction from "@counterfactual/contracts/build/contracts/ConditionalTransaction.json";
import { AppIdentity, Terms } from "@counterfactual/types";
import { ethers } from "ethers";

import { APP_IDENTITY } from "../../encodings";

import { MultisigTxOp } from "./multisig-tx-op";
import { MultisigInput, Operation } from "./types";

const { keccak256, solidityPack } = ethers.utils;

// FIXME: generaize, also used in op set state
const appIdentityToHash = (appIdentity: AppIdentity): string => {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode([APP_IDENTITY], [appIdentity])
  );
};

export class OpSetup extends MultisigTxOp {
  public constructor(
    readonly networkContext: any,
    readonly multisig: string,
    readonly multisigOwners: string[],
    readonly freeBalanceAppIdentity: AppIdentity,
    readonly freeBalanceTerms: Terms,
    readonly dependencyNonce: cf.legacy.utils.Nonce
  ) {
    super(multisig, multisigOwners);
    if (dependencyNonce === undefined) {
      throw new Error("Undefined dependency nonce");
    }
  }

  multisigInput(): MultisigInput {
    const terms = cf.legacy.utils.FreeBalance.terms();

    const uninstallKey = keccak256(
      solidityPack(
        ["address", "uint256", "uint256"],
        [this.multisig, 0, this.dependencyNonce.salt]
      )
    );

    const multisigCalldata = new ethers.utils.Interface(
      StateChannelTransaction.abi
    ).functions.executeAppConditionalTransaction.encode([
      this.networkContext.AppRegistry,
      this.networkContext.NonceRegistry,
      uninstallKey,
      appIdentityToHash(this.freeBalanceAppIdentity),
      terms
    ]);

    return new MultisigInput(
      this.networkContext.StateChannelTransaction,
      0,
      multisigCalldata,
      Operation.Delegatecall
    );
  }
}
