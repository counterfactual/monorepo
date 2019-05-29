import UninstallKeyRegistry from "@counterfactual/contracts/build/UninstallKeyRegistry.json";
import {
  AppIdentity,
  ETHBucketAppState,
  NetworkContext
} from "@counterfactual/types";
import { defaultAbiCoder, Interface, keccak256 } from "ethers/utils";

import { MultiSendCommitment } from "./multisend-commitment";
import { MultisigOperation, MultisigTransaction } from "./types";
import { encodeETHBucketAppState } from "./utils/eth-bucket";

const uninstallKeyRegistryIface = new Interface(UninstallKeyRegistry.abi);

export class UninstallCommitment extends MultiSendCommitment {
  constructor(
    public readonly networkContext: NetworkContext,
    public readonly multisig: string,
    public readonly multisigOwners: string[],
    public readonly freeBalanceAppIdentity: AppIdentity,
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
      keccak256(encodeETHBucketAppState(freeBalanceState)),
      freeBalanceNonce,
      freeBalanceTimeout
    );
  }

  public dependencyNonceInput(): MultisigTransaction {
    return {
      to: this.networkContext.UninstallKeyRegistry,
      value: 0,
      data: uninstallKeyRegistryIface.functions.setKeyAsUninstalled.encode([
        keccak256(defaultAbiCoder.encode(["uint256"], [this.dependencyNonce]))
      ]),
      operation: MultisigOperation.Call
    };
  }

  public eachMultisigInput() {
    return [this.freeBalanceInput(), this.dependencyNonceInput()];
  }
}
