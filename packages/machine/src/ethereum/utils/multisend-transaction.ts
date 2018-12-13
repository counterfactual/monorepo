import { HashZero } from "ethers/constants";
import { Interface } from "ethers/utils";

import AppRegistry from "@counterfactual/contracts/build/contracts/AppRegistry.json";
import { AppIdentity, Terms } from "@counterfactual/types";

import { encodeTransactions } from "./multisend-encoder";
import { MultisigTransactionCommitment } from "./multisig-transaction";
import { MultisigOperation, MultisigTransaction } from "./types";

const appRegistryIface = new Interface(AppRegistry.abi);

export abstract class MultiSendCommitment extends MultisigTransactionCommitment {
  public abstract eachMultisigInput(): MultisigTransaction[];

  constructor(
    readonly networkContext: any,
    readonly multisig: string,
    readonly multisigOwners: string[],
    readonly freeBalanceAppIdentity: AppIdentity,
    readonly freeBalanceTerms: Terms,
    readonly freeBalanceStateHash: string,
    readonly freeBalanceNonce: number,
    readonly freeBalanceTimeout: number,
    readonly dependencyNonceSalt: string,
    readonly dependencyNonceValue: number
  ) {
    super(multisig, multisigOwners);
  }

  public getTransactionDetails(): MultisigTransaction {
    return {
      to: this.networkContext.MultiSend,
      value: 0,
      data: encodeTransactions(this.eachMultisigInput()),
      operation: MultisigOperation.Delegatecall
    };
  }

  public freeBalanceInput(): MultisigTransaction {
    return {
      to: this.networkContext.AppRegistry,
      value: 0,
      data: appRegistryIface.functions.setState.encode([
        this.freeBalanceAppIdentity,
        {
          stateHash: this.freeBalanceStateHash,
          nonce: this.freeBalanceNonce,
          timeout: this.freeBalanceTimeout,
          // Don't need signatures since a multisig is always calling MultiSend
          signatures: HashZero
        }
      ]),
      operation: MultisigOperation.Call
    };
  }
}
