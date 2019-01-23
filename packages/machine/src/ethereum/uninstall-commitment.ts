import NonceRegistry from "@counterfactual/contracts/build/NonceRegistry.json";
import {
  AppIdentity,
  ETHBucketAppState,
  NetworkContext,
  Terms
} from "@counterfactual/types";
import { defaultAbiCoder, Interface, keccak256 } from "ethers/utils";

import { DependencyValue } from "../models/app-instance";

import { MultiSendCommitment } from "./multisend-commitment";
import { MultisigOperation, MultisigTransaction } from "./types";
import { encodeETHBucketAppState } from "./utils/eth-bucket";

const nonceRegistryIface = new Interface(NonceRegistry.abi);

export class UninstallCommitment extends MultiSendCommitment {
  constructor(
    public readonly networkContext: NetworkContext,
    public readonly multisig: string,
    public readonly multisigOwners: string[],
    public readonly freeBalanceAppIdentity: AppIdentity,
    public readonly freeBalanceTerms: Terms,
    public readonly freeBalanceState: ETHBucketAppState,
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
      keccak256(encodeETHBucketAppState(freeBalanceState)),
      freeBalanceNonce,
      freeBalanceTimeout
    );
  }

  public dependencyNonceInput(): MultisigTransaction {
    return {
      to: this.networkContext.NonceRegistry,
      value: 0,
      data: nonceRegistryIface.functions.setNonce.encode([
        0, // Timeout is 0 for dependencyNonce!
        keccak256(defaultAbiCoder.encode(["uint256"], [this.dependencyNonce])),
        // Hard coded the update to 1 because that is the value
        // that represents an app as being "uninstalled"
        DependencyValue.UNINSTALLED
      ]),
      operation: MultisigOperation.Call
    };
  }

  public eachMultisigInput() {
    return [this.freeBalanceInput(), this.dependencyNonceInput()];
  }
}
