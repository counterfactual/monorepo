import ETHVirtualAppAgreement from "@counterfactual/contracts/build/ETHVirtualAppAgreement.json";
import { AppIdentity, NetworkContext, Terms } from "@counterfactual/types";
import { BigNumber, Interface } from "ethers/utils";

import { MultiSendCommitment } from "./multisend-commitment";
import { MultisigOperation, MultisigTransaction } from "./types";

const iface = new Interface(ETHVirtualAppAgreement.abi);

export class ETHVirtualAppAgreementCommitment extends MultiSendCommitment {
  constructor(
    public readonly networkContext: NetworkContext,
    public readonly multisig: string,
    public readonly multisigOwners: string[],
    public readonly targetAppIdentityHash: string,
    public readonly freeBalanceAppIdentity: AppIdentity,
    public readonly freeBalanceTerms: Terms,
    public readonly freeBalanceStateHash: string,
    public readonly freeBalanceNonce: number,
    public readonly freeBalanceTimeout: number,
    public readonly dependencyNonce: number,
    public readonly rootNonceValue: number,
    public readonly expiry: BigNumber,
    public readonly capitalProvided: BigNumber,
    public readonly beneficiaries: string[],
    public readonly terms?: Terms
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
    if (this.networkContext.ETHVirtualAppAgreement === undefined) {
      throw Error("undefined ETHVirtualAppAgreement");
    }
    if (this.terms === undefined) {
      throw Error("undefined terms");
    }
    return {
      to: this.networkContext.ETHVirtualAppAgreement,
      value: 0,
      data: iface.functions.delegateTarget.encode([
        {
          registry: this.networkContext.AppRegistry,
          terms: this.terms!,
          expiry: this.expiry,
          appIdentityHash: this.targetAppIdentityHash,
          capitalProvided: this.capitalProvided,
          beneficiaries: this.beneficiaries
        }
      ]),
      operation: MultisigOperation.DelegateCall
    };
  }
}
