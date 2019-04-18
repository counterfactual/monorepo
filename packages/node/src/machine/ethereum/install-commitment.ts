import StateChannelTransaction from "@counterfactual/contracts/build/StateChannelTransaction.json";
import { AppIdentity, NetworkContext, Terms } from "@counterfactual/types";
import { Interface, keccak256, solidityPack } from "ethers/utils";

import { MultiSendCommitment } from "./multisend-commitment";
import { MultisigOperation, MultisigTransaction } from "./types";
import { appIdentityToHash } from "./utils/app-identity";

const iface = new Interface(StateChannelTransaction.abi);

export class InstallCommitment extends MultiSendCommitment {
  constructor(
    public readonly networkContext: NetworkContext,
    public readonly multisig: string,
    public readonly multisigOwners: string[],
    public readonly appIdentity: AppIdentity,
    public readonly terms: Terms,
    public readonly freeBalanceAppIdentity: AppIdentity,
    public readonly freeBalanceTerms: Terms,
    public readonly freeBalanceStateHash: string,
    public readonly freeBalanceNonce: number,
    public readonly freeBalanceTimeout: number,
    public readonly dependencyNonce: number,
    public readonly rootNonceValue: number
  ) {
    super(
      networkContext,
      multisig,
      multisigOwners,
      freeBalanceAppIdentity,
      freeBalanceTerms,
      freeBalanceStateHash,
      freeBalanceNonce,
      freeBalanceTimeout
    );
  }

  public eachMultisigInput() {
    return [this.freeBalanceInput(), this.conditionalTransactionInput()];
  }

  private conditionalTransactionInput(): MultisigTransaction {
    const uninstallKey = keccak256(
      solidityPack(
        ["address", "uint256", "bytes32"],
        [
          this.multisig,
          0,
          keccak256(solidityPack(["uint256"], [this.dependencyNonce]))
        ]
      )
    );

    const appIdentityHash = appIdentityToHash(this.appIdentity);

    return {
      to: this.networkContext.StateChannelTransaction,
      value: 0,
      data: iface.functions.executeAppConditionalTransaction.encode([
        this.networkContext.AppRegistry,
        this.networkContext.NonceRegistry,
        uninstallKey,
        this.rootNonceValue,
        appIdentityHash,
        this.terms
      ]),
      operation: MultisigOperation.DelegateCall
    };
  }
}
