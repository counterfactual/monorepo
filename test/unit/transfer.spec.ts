import * as ethers from "ethers";

import * as Utils from "@counterfactual/test-utils";

const Transfer = artifacts.require("Transfer");
const ExampleTransfer = artifacts.require("ExampleTransfer");
const DelegateProxy = artifacts.require("DelegateProxy");
const DolphinCoin = artifacts.require("DolphinCoin");

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

contract("Transfer", (accounts: string[]) => {
  let transfer: ethers.Contract;
  let delegateProxy: ethers.Contract;
  let dolphinCoin: ethers.Contract;

  enum AssetType {
    ETH,
    ERC20,
    ANY
  }

  before(async () => {
    ExampleTransfer.link("Transfer", Transfer.address);
    transfer = await Utils.deployContract(ExampleTransfer, unlockedAccount);
    delegateProxy = await Utils.deployContract(DelegateProxy, unlockedAccount);
    dolphinCoin = await Utils.deployContract(DolphinCoin, unlockedAccount);
  });

  describe("Executes delegated transfers for ETH", () => {
    beforeEach(async () => {
      await unlockedAccount.sendTransaction({
        to: delegateProxy.address,
        value: Utils.UNIT_ETH
      });
    });

    it("for 1 address", async () => {
      const randomTarget = Utils.randomETHAddress();

      const details = {
        value: [Utils.UNIT_ETH],
        assetType: AssetType.ETH,
        to: [randomTarget],
        token: Utils.ZERO_ADDRESS,
        data: []
      };

      await delegateProxy.functions.delegate(
        transfer.address,
        transfer.interface.functions.transfer.encode([details]),
        Utils.HIGH_GAS_LIMIT
      );

      const balTarget = await provider.getBalance(randomTarget);

      balTarget.should.be.bignumber.equal(Utils.UNIT_ETH);
    });

    it("for many addresses", async () => {
      const randomTargets: string[] = Array.from({ length: 10 }, () =>
        Utils.randomETHAddress()
      );

      const details = {
        value: randomTargets.map(_ => Utils.UNIT_ETH.div(10)),
        assetType: AssetType.ETH,
        to: randomTargets,
        token: Utils.ZERO_ADDRESS,
        data: []
      };

      await delegateProxy.functions.delegate(
        transfer.address,
        transfer.interface.functions.transfer.encode([details]),
        Utils.HIGH_GAS_LIMIT
      );

      for (let i = 0; i < 10; i++) {
        const bal = await provider.getBalance(randomTargets[i]);
        bal.should.be.bignumber.equal(Utils.UNIT_ETH.div(10));
      }
    });
  });

  describe("Executes delegated transfers for ERC20", () => {
    beforeEach(async () => {
      await dolphinCoin.functions.transfer(delegateProxy.address, 10);
    });

    it("for 1 address", async () => {
      const randomTarget = Utils.randomETHAddress();

      const details = {
        value: [10],
        assetType: AssetType.ERC20,
        to: [randomTarget],
        token: dolphinCoin.address,
        data: []
      };

      await delegateProxy.functions.delegate(
        transfer.address,
        transfer.interface.functions.transfer.encode([details]),
        Utils.HIGH_GAS_LIMIT
      );

      const balTarget = await dolphinCoin.functions.balanceOf(randomTarget);

      balTarget.should.be.bignumber.equal(10);
    });

    it("for many addresses", async () => {
      const randomTargets: string[] = Array.from({ length: 10 }, () =>
        Utils.randomETHAddress()
      );

      const details = {
        value: randomTargets.map(_ => 1),
        assetType: AssetType.ERC20,
        to: randomTargets,
        token: dolphinCoin.address,
        data: []
      };

      await delegateProxy.functions.delegate(
        transfer.address,
        transfer.interface.functions.transfer.encode([details]),
        Utils.HIGH_GAS_LIMIT
      );

      for (let i = 0; i < 10; i++) {
        const bal = await dolphinCoin.functions.balanceOf(randomTargets[i]);
        bal.should.be.bignumber.equal(1);
      }
    });
  });
});
