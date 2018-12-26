import StateChannelTransaction from "@counterfactual/contracts/build/contracts/StateChannelTransaction.json";
import { AppIdentity, NetworkContext, Terms } from "@counterfactual/types";
import {
  defaultAbiCoder,
  Interface,
  keccak256,
  solidityPack
} from "ethers/utils";

import { DependencyValue } from "../models/app-instance";

import { MultisigTransactionCommitment } from "./multisig-commitment";
import { MultisigOperation, MultisigTransaction } from "./types";
import { appIdentityToHash } from "./utils/app-identity";

const iface = new Interface(StateChannelTransaction.abi);

export class SetupCommitment extends MultisigTransactionCommitment {
  public constructor(
    public readonly networkContext: NetworkContext,
    public readonly multisigAddress: string,
    public readonly multisigOwners: string[],
    public readonly freeBalanceAppIdentity: AppIdentity,
    public readonly freeBalanceTerms: Terms
  ) {
    super(multisigAddress, multisigOwners);
  }

  public getTransactionDetails(): MultisigTransaction {
    return {
      to: this.networkContext.StateChannelTransaction,
      value: 0,
      data: iface.functions.executeAppConditionalTransaction.encode([
        this.networkContext.AppRegistry,
        this.networkContext.NonceRegistry,
        this.getUninstallKeyForNonceRegistry(),
        appIdentityToHash(this.freeBalanceAppIdentity),
        this.freeBalanceTerms
      ]),
      operation: MultisigOperation.DelegateCall
    };
  }

  private getUninstallKeyForNonceRegistry() {
    return keccak256(
      solidityPack(
        ["address", "uint256", "bytes32"],
        [
          this.multisigAddress,
          // The timeout is hard-coded to be 0 as is defined by the protocol
          0,
          this.getSaltForDependencyNonce()
        ]
      )
    );
  }

  private getSaltForDependencyNonce() {
    return keccak256(
      defaultAbiCoder.encode(["uint256"], [DependencyValue.NOT_UNINSTALLED])
    );
  }
}
