import { Wallet } from "ethers";
import { TransactionRequest, TransactionResponse } from "ethers/providers";

export default class AutoNonceWallet extends Wallet {
  private noncePromise;

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    if (!tx.nonce) {
      if (this.noncePromise === undefined) {
        this.noncePromise = this.provider.getTransactionCount(this.address);
      }

      tx.nonce = await this.noncePromise;

      this.noncePromise = this.noncePromise.then(nonce => nonce + 1);
    }

    return await super.sendTransaction(tx);
  }
}
