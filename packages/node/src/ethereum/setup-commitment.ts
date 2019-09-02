import ConditionalTransactionDelegateTarget from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/ConditionalTransactionDelegateTarget.json";
import { AppIdentity, NetworkContext } from "@counterfactual/types";
import { Interface } from "ethers/utils";

import { MultisigCommitment } from "./multisig-commitment";
import { MultisigOperation, MultisigTransaction } from "./types";
import { appIdentityToHash } from "./utils/app-identity";

const iface = new Interface(ConditionalTransactionDelegateTarget.abi);

export class SetupCommitment extends MultisigCommitment {
  public constructor(
    public readonly networkContext: NetworkContext,
    public readonly multisigAddress: string,
    public readonly multisigOwners: string[],
    public readonly freeBalanceAppIdentity: AppIdentity
  ) {
    super(multisigAddress, multisigOwners);
  }

  public getTransactionDetails(): MultisigTransaction {
    return {
      to: this.networkContext.ConditionalTransactionDelegateTarget,
      value: 0,
      data: iface.functions.executeEffectOfFreeBalance.encode([
        this.networkContext.ChallengeRegistry,
        appIdentityToHash(this.freeBalanceAppIdentity),
        this.networkContext.MultiAssetMultiPartyCoinTransferInterpreter
      ]),
      operation: MultisigOperation.DelegateCall
    };
  }
}
