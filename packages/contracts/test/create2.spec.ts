import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { Zero } from "ethers/constants";
import { Web3Provider } from "ethers/providers";

import Echo from "../build/Echo.json";
import ProxyFactory from "../build/ProxyFactory.json";

describe("ProxyFactory with CREATE2", () => {
  let provider: Web3Provider;
  let wallet: Wallet;

  let proxyFactory: Contract;
  let echo: Contract;

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    proxyFactory = await waffle.deployContract(wallet, ProxyFactory);
    echo = await waffle.deployContract(wallet, Echo);
  });

  describe("", () => {
    it("??", async () => {
      console.log(echo.address);
      await proxyFactory.functions.createProxy(echo.address, Zero);
    });
  });
});
