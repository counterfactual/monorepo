import ETHVirtualAppAgreement from "@counterfactual/contracts/build/contracts/ETHVirtualAppAgreement.json";
import { AppIdentity, NetworkContext, Terms } from "@counterfactual/types";
import { Interface, keccak256, solidityPack } from "ethers/utils";

import { DependencyValue } from "../models/app-instance";

import { MultiSendCommitment } from "./multisend-commitment";
import { MultisigOperation, MultisigTransaction } from "./types";

const iface = new Interface(ETHVirtualAppAgreement.abi);

export class VirtualAppETHAgreementCommitment extends MultiSendCommitment {
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
    public readonly terms?: Terms,
  ) {
    super(
      networkContext,
      multisig,
      multisigOwners,
      freeBalanceAppIdentity,
      freeBalanceTerms,
      freeBalanceStateHash,
      freeBalanceNonce,
      freeBalanceTimeout,
      keccak256(solidityPack(["uint256"], [dependencyNonce])),
      DependencyValue.NOT_UNINSTALLED
    );
  }

  public eachMultisigInput() {
    return [this.freeBalanceInput(), this.conditionalTransactionInput()];
  }

  private conditionalTransactionInput(): MultisigTransaction {
    return {
      to: this.networkContext.ETHVirtualAppAgreement,
      value: 0,
      data: iface.functions.delegateTarget.encode(["0x0"]),
      operation: MultisigOperation.DelegateCall
    };
  }
}
