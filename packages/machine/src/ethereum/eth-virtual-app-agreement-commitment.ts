import ETHVirtualAppAgreement from "@counterfactual/contracts/build/ETHVirtualAppAgreement.json";
import {
  AppIdentity,
  AssetType,
  NetworkContext,
  Terms
} from "@counterfactual/types";
import { AddressZero } from "ethers/constants";
import { BigNumber, getAddress, Interface } from "ethers/utils";

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
    public readonly expiryBlock: BigNumber,
    public readonly capitalProvided: BigNumber,
    public readonly beneficiaries: string[],
    public readonly uninstallKey: string
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
    if (this.networkContext.ETHVirtualAppAgreement === undefined) {
      throw Error("undefined ETHVirtualAppAgreement");
    }
    if (this.beneficiaries.length !== 2) {
      throw Error(
        `ETHVirtualAppAgreement currently only supports 2 beneficiaries but got ${
          this.beneficiaries.length
        }`
      );
    }
    // normalize addresses and fail early on any invalid addresses
    this.beneficiaries = this.beneficiaries.map(getAddress);
  }

  public eachMultisigInput() {
    return [this.freeBalanceInput(), this.conditionalTransactionInput()];
  }

  private conditionalTransactionInput(): MultisigTransaction {
    return {
      to: this.networkContext.ETHVirtualAppAgreement,
      value: 0,
      data: iface.functions.delegateTarget.encode([
        {
          registry: this.networkContext.AppRegistry,
          nonceRegistry: this.networkContext.NonceRegistry,
          terms: {
            assetType: AssetType.ETH,
            limit: new BigNumber(0),
            token: AddressZero
          },
          expiry: this.expiryBlock,
          appIdentityHash: this.targetAppIdentityHash,
          capitalProvided: this.capitalProvided,
          beneficiaries: this.beneficiaries,
          uninstallKey: this.uninstallKey
        }
      ]),
      operation: MultisigOperation.DelegateCall
    };
  }
}
