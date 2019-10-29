import { Wallet } from "ethers";
import { TransactionRequest, TransactionResponse } from "ethers/providers";

export default class AutoNonceWallet extends Wallet {
  private noncePromise;

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    if (!tx.nonce) {
      if (this.noncePromise === undefined) {
        this.noncePromise = this.provider.getTransactionCount(this.address);
      }

      const tmp = this.noncePromise;

      this.noncePromise = this.noncePromise.then(nonce => nonce + 1);

      tx.nonce = await tmp;
    }

    return await super.sendTransaction(tx);
  }
}
