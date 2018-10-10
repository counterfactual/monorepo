import * as ethers from "ethers";
import * as abi from "../../abi";
import { Address, NetworkContext } from "../../types";
import {
  CfFreeBalance,
  CfNonce,
  CfStateChannel,
  MultisigInput,
  Operation
} from "./types";

import { CfMultiSendOp } from "./cf-multisend-op";

const { keccak256 } = ethers.utils;

export class CfOpSetup extends CfMultiSendOp {
  /**
   * Helper method to get hash of an input calldata
   * @param multisig
   * @param multisigInput
   */
  public constructor(
    readonly ctx: NetworkContext,
    readonly multisig: Address,
    readonly freeBalanceStateChannel: CfStateChannel,
    readonly freeBalance: CfFreeBalance,
    readonly nonce: CfNonce
  ) {
    super(ctx, multisig, freeBalance, nonce);
  }

  /**
   * @override common.CfMultiSendOp
   */
  public eachMultisigInput(): MultisigInput[] {
    return [this.dependencyNonceInput(), this.conditionalTransferInput()];
  }

  public conditionalTransferInput(): MultisigInput {
    const terms = CfFreeBalance.terms();

    const depNonceKey = keccak256(
      abi.encodePacked(
        ["address", "uint256", "uint256"],
        [this.multisig, 0, this.dependencyNonce.salt]
      )
    );

    const multisigCalldata = new ethers.utils.Interface(
      this.ctx.ConditionalTransfer.abi
    ).functions.executeAppConditionalTransfer.encode([
      this.ctx.Registry.address,
      this.ctx.NonceRegistry.address,
      depNonceKey,
      this.dependencyNonce.nonceValue,
      this.freeBalanceStateChannel.cfAddress(),
      [terms.assetType, terms.limit, terms.token]
    ]);

    return new MultisigInput(
      this.ctx.ConditionalTransfer.address,
      0,
      multisigCalldata,
      Operation.Delegatecall
    );
  }
}
