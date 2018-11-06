import * as cf from "@counterfactual/cf.js";

import * as common from "./common";
import { CfAppInstance, CfOperation, Transaction } from "./types";

export class CfOpSetState extends CfOperation {
  constructor(
    readonly ctx: cf.utils.NetworkContext,
    readonly multisig: cf.utils.Address,
    readonly signingKeys: cf.utils.Address[],
    readonly appStateHash: string,
    readonly appUniqueId: number,
    readonly terms: cf.app.Terms,
    readonly app: cf.app.CfAppInterface,
    readonly appLocalNonce: number,
    readonly timeout: number
  ) {
    super();
  }

  public hashToSign(): string {
    return cf.utils.abi.keccak256(
      cf.utils.abi.encodePacked(
        ["bytes1", "address[]", "uint256", "uint256", "bytes32"],
        [
          "0x19",
          this.signingKeys,
          this.appLocalNonce,
          this.timeout,
          this.appStateHash
        ]
      )
    );
  }

  /**
   * @returns a tx that executes a proxyCall through the registry to call
   *          `setState` on AppInstance.sol.
   */
  public transaction(sigs: cf.utils.Signature[]): Transaction {
    const appCfAddr = new CfAppInstance(
      this.ctx,
      this.multisig,
      this.signingKeys,
      this.app,
      this.terms,
      this.timeout,
      this.appUniqueId
    ).cfAddress();
    const to = this.ctx.registryAddr;
    const val = 0;
    const data = common.proxyCallSetStateData(
      this.ctx,
      this.appStateHash,
      appCfAddr,
      this.appLocalNonce,
      this.timeout,
      cf.utils.Signature.toSortedBytes(sigs, this.hashToSign())
    );
    return new Transaction(to, val, data);
  }
}
