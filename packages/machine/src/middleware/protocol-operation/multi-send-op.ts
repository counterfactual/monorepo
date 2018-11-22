import * as cf from "@counterfactual/cf.js";
import NonceRegistryJson from "@counterfactual/contracts/build/contracts/NonceRegistry.json";
import { ethers } from "ethers";

import * as common from "./common";
import { MultisigTxOp } from "./multisig-tx-op";
import { MultiSend, MultisigInput, Operation } from "./types";

const { keccak256 } = ethers.utils;

export abstract class MultiSendOp extends MultisigTxOp {
  constructor(
    readonly networkContext: cf.legacy.network.NetworkContext,
    readonly multisig: cf.legacy.utils.Address,
    readonly freeBalance: cf.legacy.utils.FreeBalance,
    readonly dependencyNonce: cf.legacy.utils.Nonce
  ) {
    super(multisig, freeBalance);
  }

  public freeBalanceInput(): MultisigInput {
    const to = this.networkContext.registryAddr;
    const val = 0;
    const data = this.freeBalanceData();
    const op = Operation.Delegatecall;
    return new MultisigInput(to, val, data, op);
  }

  public freeBalanceData(): cf.legacy.utils.Bytes {
    const terms = cf.legacy.utils.FreeBalance.terms();
    const app = cf.legacy.utils.FreeBalance.contractInterface(
      this.networkContext
    );
    const freeBalanceCfAddress = new cf.legacy.app.AppInstance(
      this.networkContext,
      this.multisig,
      [this.freeBalance.alice, this.freeBalance.bob],
      app,
      terms,
      this.freeBalance.timeout,
      this.freeBalance.uniqueId
    ).cfAddress();

    const appStateHash = keccak256(
      cf.utils.abi.encode(
        ["address", "address", "uint256", "uint256"],
        [
          this.freeBalance.alice,
          this.freeBalance.bob,
          this.freeBalance.aliceBalance,
          this.freeBalance.bobBalance
        ]
      )
    );
    // don't need signatures since the multisig is the owner
    const signatures = "0x0";
    return common.proxyCallSetStateData(
      this.networkContext,
      appStateHash,
      freeBalanceCfAddress,
      this.freeBalance.localNonce,
      this.freeBalance.timeout,
      signatures
    );
  }

  public dependencyNonceInput(): MultisigInput {
    // FIXME: new NonceRegistryJson design will obviate timeout
    // https://github.com/counterfactual/monorepo/issues/122
    const timeout = 0;
    const to = this.networkContext.nonceRegistryAddr;
    const val = 0;
    const data = new ethers.utils.Interface(
      NonceRegistryJson.abi
    ).functions.setNonce.encode([
      timeout,
      this.dependencyNonce.salt,
      this.dependencyNonce.nonceValue
    ]);
    const op = Operation.Call;
    return new MultisigInput(to, val, data, op);
  }

  public abstract eachMultisigInput(): MultisigInput[];

  /**
   * @returns the input for the transaction from the multisig that will trigger
   *          a multisend transaction.
   */
  multisigInput(): MultisigInput {
    return new MultiSend(this.eachMultisigInput(), this.networkContext).input(
      this.networkContext.multiSendAddr
    );
  }
}
