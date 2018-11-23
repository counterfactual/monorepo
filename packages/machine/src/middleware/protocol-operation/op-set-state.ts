import * as cf from "@counterfactual/cf.js";
import { ethers } from "ethers";

import * as common from "./common";
import { ProtocolOperation, Transaction } from "./types";

const { keccak256 } = ethers.utils;
const { abi } = cf.utils;

export class OpSetState extends ProtocolOperation {
  constructor(
    readonly ctx: cf.legacy.network.NetworkContext,
    readonly multisig: cf.legacy.utils.Address,
    readonly signingKeys: cf.legacy.utils.Address[],
    readonly appStateHash: string,
    readonly appUniqueId: number,
    readonly terms: cf.legacy.app.Terms,
    readonly app: cf.legacy.app.AppInterface,
    readonly appLocalNonce: number,
    readonly timeout: number
  ) {
    super();
  }

  public hashToSign(): string {
    return keccak256(
      abi.encodePacked(
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
  public transaction(sigs: ethers.utils.Signature[]): Transaction {
    const appCfAddr = new cf.legacy.app.AppInstance(
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
      cf.utils.signaturesToSortedBytes(this.hashToSign(), ...sigs)
    );
    return new Transaction(to, val, data);
  }
}
