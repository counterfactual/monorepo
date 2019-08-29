import DolphinCoin from "../expected-build-artifacts/DolphinCoin.json";
import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { Web3Provider } from "ethers/providers";
import { bigNumberify } from "ethers/utils";

import { expect } from "./utils/index";

const DOLPHINCOIN_SUPPLY = bigNumberify(10)
  .pow(18)
  .mul(10000);

describe("DolphinCoin (ERC20) can be created", () => {
  let provider: Web3Provider;
  let wallet: Wallet;
  let erc20: Contract;

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];
    erc20 = await waffle.deployContract(wallet, DolphinCoin);
  });

  describe("Deployer has all of initial supply", () => {
    it("Initial supply for deployer is DOLPHINCOIN_SUPPLY", async () => {
      expect(await erc20.functions.balanceOf(wallet.address)).to.be.eq(
        DOLPHINCOIN_SUPPLY
      );
    });
  });
});
