import TwoPartyVirtualEthAsLump from "@counterfactual/contracts/build/TwoPartyVirtualEthAsLump.json";
import { AppIdentity, NetworkContext } from "@counterfactual/types";
import { BigNumber, getAddress, Interface } from "ethers/utils";

import { MultiSendCommitment } from "./multisend-commitment";
import { MultisigOperation, MultisigTransaction } from "./types";

const iface = new Interface(TwoPartyVirtualEthAsLump.abi);

export class TwoPartyVirtualEthAsLumpCommitment extends MultiSendCommitment {
  constructor(
    public readonly networkContext: NetworkContext,
    public readonly multisig: string,
    public readonly multisigOwners: string[],
    public readonly targetAppIdentityHash: string,
    public readonly freeBalanceAppIdentity: AppIdentity,
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
      freeBalanceStateHash,
      freeBalanceNonce,
      freeBalanceTimeout
    );
    if (this.networkContext.TwoPartyVirtualEthAsLump === undefined) {
      throw Error("undefined TwoPartyVirtualEthAsLump");
    }
    if (this.beneficiaries.length !== 2) {
      throw Error(
        `TwoPartyVirtualEthAsLump currently only supports 2 beneficiaries but got ${
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
      to: this.networkContext.TwoPartyVirtualEthAsLump,
      value: 0,
      data: iface.functions.delegateTarget.encode([
        {
          registry: this.networkContext.ChallengeRegistry,
          rootNonceRegistry: this.networkContext.RootNonceRegistry,
          uninstallKeyRegistry: this.networkContext.UninstallKeyRegistry,
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
