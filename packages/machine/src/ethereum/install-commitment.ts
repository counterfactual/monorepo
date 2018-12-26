import StateChannelTransaction from "@counterfactual/contracts/build/contracts/StateChannelTransaction.json";
import { AppIdentity, NetworkContext, Terms } from "@counterfactual/types";
import {
  defaultAbiCoder,
  Interface,
  keccak256,
  solidityPack
} from "ethers/utils";

import { DependencyValue } from "../../models/app-instance";

import { MultisigOperation, MultisigTransaction } from "./types";
import { APP_IDENTITY } from "./utils/encodings";
import { MultiSendCommitment } from "./utils/multi-send-op";

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
    public readonly dependencyNonce: number
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
      keccak256(defaultAbiCoder.encode(["uint256"], [dependencyNonce])),
      DependencyValue.NOT_UNINSTALLED
    );
  }

  public eachMultisigInput() {
    return [this.freeBalanceInput(), this.conditionalTransactionInput()];
  }

  private conditionalTransactionInput(): MultisigTransaction {
    const uninstallKey = keccak256(
      solidityPack(
        ["address", "uint256", "uint256"],
        [this.multisig, 0, this.dependencyNonceSalt]
      )
    );

    const appInstanceId = keccak256(
      defaultAbiCoder.encode([APP_IDENTITY], [this.appIdentity])
    );

    return {
      to: this.networkContext.StateChannelTransaction,
      value: 0,
      data: iface.functions.executeAppConditionalTransaction.encode([
        this.networkContext.AppRegistry,
        this.networkContext.NonceRegistry,
        uninstallKey,
        appInstanceId,
        this.terms
      ]),
      operation: MultisigOperation.DelegateCall
    };
  }
}
