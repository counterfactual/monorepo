import { Wallet } from "ethers";

export class TestPrivateKeyGenerator {
  private uniqueIDToGeneratedPrivateKeys: Map<string, string>;

  constructor() {
    this.uniqueIDToGeneratedPrivateKeys = new Map();
  }

  generatePrivateKey(uniqueID: string): Promise<string> {
    if (!uniqueID) {
      throw new Error(
        "A string value must be supplied to generate a private key"
      );
    }
    // FIXME: why is this not defined after the class is instantiated...
    if (!this.uniqueIDToGeneratedPrivateKeys) {
      this.uniqueIDToGeneratedPrivateKeys = new Map();
    }

    if (this.uniqueIDToGeneratedPrivateKeys.has(uniqueID)) {
      return Promise.resolve(
        this.uniqueIDToGeneratedPrivateKeys.get(uniqueID)!
      );
    }
    const newPrivateKey = Wallet.createRandom().privateKey;
    this.uniqueIDToGeneratedPrivateKeys = this.uniqueIDToGeneratedPrivateKeys.set(
      uniqueID,
      newPrivateKey
    );

    return Promise.resolve(newPrivateKey);
  }
}
