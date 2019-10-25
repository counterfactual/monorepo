import { EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT } from "@counterfactual/types";
import dotenvExtended from "dotenv-extended";
import { Wallet } from "ethers";
import { AddressZero } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import { parseEther } from "ethers/utils";
import { fromExtendedKey } from "ethers/utils/hdnode";
import ganache from "ganache-core";

import {
  deployTestArtifactsToChain,
  NetworkContextForTestSuite
} from "./contract-deployments.jest";

dotenvExtended.load();

export { NetworkContextForTestSuite };

export const CF_PATH = "m/44'/60'/0'/25446";

export class LocalGanacheServer {
  provider: Web3Provider;
  fundedPrivateKey: string;
  server: any;
  networkContext: NetworkContextForTestSuite;

  constructor(extendedPrvKeys: string[], initialBalance: string = "1000") {
    if (!process.env.GANACHE_PORT) {
      throw new Error("No GANACHE_PORT found. Aborting!");
    }

    this.networkContext = EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT.reduce(
      (acc, contractName) => ({ ...acc, [contractName]: AddressZero }),
      {
        TicTacToeApp: AddressZero,
        DolphinCoin: AddressZero
      } as NetworkContextForTestSuite
    );

    const balance = parseEther(initialBalance).toString();

    this.fundedPrivateKey = Wallet.createRandom().privateKey;

    const accounts: object[] = [];

    extendedPrvKeys.forEach(xprv => {
      const entry = {
        balance,
        secretKey: fromExtendedKey(xprv)
          .derivePath(CF_PATH)
          .derivePath("0").privateKey
      };
      accounts.push(entry);
    });

    accounts.push({
      balance,
      secretKey: this.fundedPrivateKey
    });

    this.server = ganache.server({
      accounts,
      gasLimit: 17592186044415, // 0xfffffffffff
      gasPrice: "0x01"
    });

    this.server.listen(parseInt(process.env.GANACHE_PORT!, 10));

    this.provider = new Web3Provider(this.server.provider);
  }

  async runMigrations() {
    this.networkContext = await deployTestArtifactsToChain(
      new Wallet(this.fundedPrivateKey, this.provider)
    );
  }
}
