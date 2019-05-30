import StateChannelTransaction from "@counterfactual/contracts/build/StateChannelTransaction.json";
import { AppIdentity, NetworkContext } from "@counterfactual/types";
import { MaxUint256 } from "ethers/constants";
import {
  defaultAbiCoder,
  Interface,
  keccak256,
  solidityPack
} from "ethers/utils";

import { MultisigCommitment } from "./multisig-commitment";
import { MultisigOperation, MultisigTransaction } from "./types";
import { appIdentityToHash } from "./utils/app-identity";

const iface = new Interface(StateChannelTransaction.abi);

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
      to: this.networkContext.StateChannelTransaction,
      value: 0,
      data: iface.functions.executeEffectOfInterpretedAppOutcome.encode([
        this.networkContext.ChallengeRegistry,
        this.networkContext.RootNonceRegistry,
        this.networkContext.UninstallKeyRegistry,
        this.getUninstallKeyForUninstallKeyRegistry(),
        // NOTE: We *assume* here that the root nonce value will be 0
        //       when creating the setup commitment
        0,
        appIdentityToHash(this.freeBalanceAppIdentity),
        this.networkContext.ETHInterpreter,
        defaultAbiCoder.encode(["uint256"], [MaxUint256])
      ]),
      operation: MultisigOperation.DelegateCall
    };
  }

  private getUninstallKeyForUninstallKeyRegistry(): string {
    return keccak256(
      solidityPack(
        ["address", "bytes32"],
        [this.multisigAddress, this.getSaltForDependencyNonce()]
      )
    );
  }

  private getSaltForDependencyNonce(): string {
    // We use 0 here because the ETH free balance has always the 0th appSeqNo
    return keccak256(defaultAbiCoder.encode(["uint256"], [0]));
  }
}
