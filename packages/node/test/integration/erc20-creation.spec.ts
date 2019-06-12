import DolphinCoin from "@counterfactual/contracts/build/DolphinCoin.json";
import { Contract, Wallet } from "ethers";
import { JsonRpcProvider } from "ethers/providers";
import { bigNumberify } from "ethers/utils";

describe("DolphinCoin (ERC20) can be created", () => {
  let provider: JsonRpcProvider;
  JsonRpcProvider;

  beforeAll(async () => {
    provider = new JsonRpcProvider(global["ganacheURL"]);
  });

  describe("Deployer has all of initial supply", () => {
    it("Initial supply for deployer is not 0", async () => {
      const deployerAccount = new Wallet(global["fundedPrivateKey"]);

      const contract = new Contract(
        global["networkContext"]["DolphinCoin"],
        DolphinCoin.abi,
        provider
      );

      const initialSupply = bigNumberify(10)
        .pow(18)
        .mul(10000);
      expect(
        contract.functions.balanceOf(deployerAccount.address)
      ).resolves.toEqual(initialSupply);
    });
  });
});
