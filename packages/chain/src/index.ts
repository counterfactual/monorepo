import { NetworkContext } from "@counterfactual/types";
import dotenvExtended from "dotenv-extended";
import { Wallet } from "ethers";
import { Web3Provider } from "ethers/providers";
import { parseEther } from "ethers/utils";
import { fromMnemonic } from "ethers/utils/hdnode";
import ganache from "ganache-core";

import { deployTestArtifactsToChain } from "./contract-deployments.jest";

dotenvExtended.load();

export const CF_PATH = "m/44'/60'/0'/25446";

export class Chain {
  provider: Web3Provider;
  fundedPrivateKey: string;
  server: any;
  networkContext: NetworkContext = Object.create(null);

  constructor(mnemonics: string[], initialBalance: string = "1000") {
    if (!process.env.GANACHE_PORT) {
      throw Error("No GANACHE_PORT found. Aborting!");
    }

    const balance = parseEther(initialBalance).toString();
    this.fundedPrivateKey = Wallet.createRandom().privateKey;

    const accounts: object[] = [
      {
        balance,
        secretKey: this.fundedPrivateKey
      }
    ];

    mnemonics.forEach(mnemonic => {
      const entry = {
        balance,
        secretKey: fromMnemonic(mnemonic).derivePath(CF_PATH).privateKey
      };
      accounts.push(entry);
    });

    this.server = ganache.server({
      accounts,
      gasLimit: "0xfffffffffff",
      gasPrice: "0x01"
    });

    this.server.listen(parseInt(process.env.GANACHE_PORT!, 10));
    this.provider = new Web3Provider(this.server.provider);
  }

  async createConfiguredChain(): Promise<NetworkContext> {
    const wallet = new Wallet(this.fundedPrivateKey, this.provider);
    this.networkContext = await deployTestArtifactsToChain(wallet);
    return this.networkContext;
  }
}
