import { Wallet } from "ethers";

export class TestPrivateKeyGenerator {
  private uniqueIDToGeneratedPrivateKeys: Map<string, string>;

  constructor() {
    console.log("new instance of test private key generator");
    this.uniqueIDToGeneratedPrivateKeys = new Map();
  }

  generatePrivateKey(uniqueID: string): Promise<string> {
    if (!uniqueID) {
      throw new Error(
        "A string value must be supplied to generate a private key"
      );
    }
    if (!this.uniqueIDToGeneratedPrivateKeys) {
      this.uniqueIDToGeneratedPrivateKeys = new Map();
    }

    console.log("generating new private key", uniqueID);
    console.log(this.uniqueIDToGeneratedPrivateKeys);
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
