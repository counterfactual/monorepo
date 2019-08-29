import ConditionalTransactionDelegateTarget from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/ConditionalTransactionDelegateTarget.json";
import { NetworkContext } from "@counterfactual/types";
import { Interface } from "ethers/utils";

import { MultisigCommitment } from "./multisig-commitment";
import { MultisigOperation } from "./types";

const iface = new Interface(ConditionalTransactionDelegateTarget.abi);

/**
 * A class to represent an unsigned multisignature wallet transaction
 * to the ConditionalTransactionDelegateTarget contract.
 * @class
 *
 * @extends {MultisigCommitment}
 */
export class ConditionalTransaction extends MultisigCommitment {
  constructor(
    public readonly networkContext: NetworkContext,
    public readonly multisig: string,
    public readonly multisigOwners: string[],
    public readonly appIdentityHash: string,
    public readonly freeBalanceAppIdentityHash: string,
    public readonly interpreterAddr: string,
    public readonly interpreterParams: string
  ) {
    super(multisig, multisigOwners);
  }

  /**
   * Takes parameters for executeEffectOfInterpretedAppOutcome function call and
   * encodes them into a bytes array for the data field of the transaction.
   *
   * @returns The (to, value, data, op) data required by MultisigCommitment
   * @memberof ConditionalTransaction
   */
  public getTransactionDetails() {
    return {
      to: this.networkContext.ConditionalTransactionDelegateTarget,
      value: 0,
      data: iface.functions.executeEffectOfInterpretedAppOutcome.encode([
        this.networkContext.ChallengeRegistry,
        this.freeBalanceAppIdentityHash,
        this.appIdentityHash,
        this.interpreterAddr,
        this.interpreterParams
      ]),
      operation: MultisigOperation.DelegateCall
    };
  }
}
