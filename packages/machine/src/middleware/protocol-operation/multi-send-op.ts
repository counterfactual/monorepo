import { ethers } from "ethers";

import AppRegistry from "@counterfactual/contracts/build/contracts/AppRegistry.json";
import NonceRegistry from "@counterfactual/contracts/build/contracts/NonceRegistry.json";
import { AppIdentity, Terms } from "@counterfactual/types";

import { MultisigTxOp } from "./multisig-tx-op";
import { MultiSend, MultisigInput, Operation } from "./types";

const { Interface } = ethers.utils;
const { HashZero } = ethers.constants;

export abstract class MultiSendOp extends MultisigTxOp {
  public abstract eachMultisigInput(): MultisigInput[];

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

  public freeBalanceInput(): MultisigInput {
    const to = this.networkContext.AppRegistry;
    const val = 0;
    const data = this.freeBalanceData();
    const op = Operation.Call;
    return new MultisigInput(to, val, data, op);
  }

  public freeBalanceData(): string {
    return new Interface(AppRegistry.abi).functions.setState.encode([
      this.freeBalanceAppIdentity,
      {
        stateHash: this.freeBalanceStateHash,
        nonce: this.freeBalanceNonce,
        timeout: this.freeBalanceTimeout,
        // Don't need signatures since a multisig is always calling MultiSend
        signatures: HashZero
      }
    ]);
  }

  public dependencyNonceInput(): MultisigInput {
    const to = this.networkContext.NonceRegistry;
    const val = 0;
    const data = new Interface(NonceRegistry.abi).functions.setNonce.encode([
      0, // Timeout is 0 for dependencyNonce!
      this.dependencyNonceSalt,
      this.dependencyNonceValue
    ]);
    const op = Operation.Call;
    return new MultisigInput(to, val, data, op);
  }

  /**
   * @returns the input for the transaction from the multisig that will trigger
   *          a multisend transaction.
   */
  multisigInput(): MultisigInput {
    return new MultiSend(this.eachMultisigInput()).input(
      this.networkContext.MultiSend
    );
  }
}
