import * as ethers from "ethers";
import { Address, H256, NetworkContext } from "../../types";
import { CfMultiSendOp } from "./cf-multisend-op";
import {
  Abi,
  CfFreeBalance,
  CfNonce,
  CfStateChannel,
  MultisigInput,
  Operation
} from "./types";

export class CfOpInstall extends CfMultiSendOp {
  constructor(
    readonly ctx: NetworkContext,
    readonly multisig: Address,
    readonly app: CfStateChannel,
    readonly cfFreeBalance: CfFreeBalance,
    readonly dependencyNonce: CfNonce
  ) {
    super(ctx, multisig, cfFreeBalance, dependencyNonce);
  }

  /**
   * @override common.CfMultiSendOp
   */
  public eachMultisigInput(): MultisigInput[] {
    return [
      this.freeBalanceInput(),
      this.dependencyNonceInput(),
      this.conditionalTransferInput()
    ];
  }

  private conditionalTransferInput(): MultisigInput {
    const to = this.ctx.ConditionalTransfer;
    const val = 0;
    const terms = [
      this.app.terms.assetType,
      this.app.terms.limit,
      this.app.terms.token
    ];
    const data = new ethers.Interface([
      Abi.executeStateChannelConditionalTransfer
    ]).functions.executeStateChannelConditionalTransfer.encode([
      this.ctx.Registry,
      this.ctx.NonceRegistry,
      this.dependencyNonce.salt,
      this.dependencyNonce.nonce,
      this.appCfAddress,
      terms
    ]);
    const op = Operation.Delegatecall;
    return new MultisigInput(to, val, data, op);
  }

  get appCfAddress(): H256 {
    return this.app.cfAddress();
  }
}
