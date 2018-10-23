import * as ethers from "ethers";
import * as abi from "../../abi";
import { Address, NetworkContext, Signature } from "../../types";
import * as common from "./common";
import {
  CfAppInterface,
  CfOperation,
  CfStateChannel,
  Terms,
  Transaction
} from "./types";

const { keccak256 } = ethers.utils;

export class CfOpSetState extends CfOperation {
  constructor(
    readonly ctx: NetworkContext,
    readonly multisig: Address,
    readonly signingKeys: Address[],
    readonly appStateHash: string,
    readonly appUniqueId: number,
    readonly terms: Terms,
    readonly app: CfAppInterface,
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
   *          `setState` on StateChannel.sol.
   */
  public transaction(sigs: Signature[]): Transaction {
    const appCfAddr = new CfStateChannel(
      this.ctx,
      this.multisig,
      this.signingKeys,
      this.app,
      this.terms,
      this.timeout,
      this.appUniqueId
    ).cfAddress();
    const to = this.ctx.Registry;
    const val = 0;
    const data = common.proxyCallSetStateData(
      this.ctx,
      this.appStateHash,
      appCfAddr,
      this.appLocalNonce,
      this.timeout,
      Signature.toSortedBytes(sigs, this.hashToSign())
    );
    return new Transaction(to, val, data);
  }
}
