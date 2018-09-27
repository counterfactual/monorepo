import * as ethers from "ethers";
import { Address, H256, NetworkContext } from "../../types";
import {
  Abi,
  CfFreeBalance,
  CfNonce,
  CfStateChannel,
  MultisigInput,
  Operation
} from "./types";

import { CfMultiSendOp } from "./cf-multisend-op";

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

  public toHash(multisig: Address, multisigInput: MultisigInput): H256 {
    multisigInput = sanitizeMultisigInput(multisigInput);
    return ethers.utils.solidityKeccak256(
      ["bytes1", "address", "address", "uint256", "bytes", "uint256"],
      [
        "0x19",
        multisig, // why did we use this as salt in the last iteration?
        multisigInput.to,
        multisigInput.val,
        multisigInput.data,
        multisigInput.op
      ]
    );
  }

  /**
   * @override common.CfMultiSendOp
   */
  public eachMultisigInput(): MultisigInput[] {
    return [this.dependencyNonceInput(), this.conditionalTransferInput()];
  }

  public conditionalTransferInput(): MultisigInput {
    const terms = CfFreeBalance.terms();

    const depNonceKey = ethers.utils.solidityKeccak256(
      ["address", "uint256", "uint256"],
      [this.multisig, 0, this.dependencyNonce.salt]
    );

    const multisigCalldata = new ethers.Interface([
      Abi.executeStateChannelConditionalTransfer
    ]).functions.executeStateChannelConditionalTransfer.encode([
      this.ctx.Registry,
      this.ctx.NonceRegistry,
      depNonceKey,
      this.dependencyNonce.nonceValue,
      this.freeBalanceStateChannel.cfAddress(),
      [terms.assetType, terms.limit, terms.token]
    ]);

    return new MultisigInput(
      this.ctx.ConditionalTransfer,
      0,
      multisigCalldata,
      Operation.Delegatecall
    );
  }
}

function sanitizeMultisigInput(multisigInput: any): MultisigInput {
  return new MultisigInput(
    multisigInput.to,
    new ethers.BigNumber(multisigInput.value).toNumber(),
    multisigInput.data,
    new ethers.BigNumber(multisigInput.operation).toNumber()
  );
}
