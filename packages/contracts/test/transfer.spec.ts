import { expect } from "chai";
import { ethers } from "ethers";

import { randomETHAddress } from "../utils/misc";

const provider = new ethers.providers.Web3Provider(
  (global as any).web3.currentProvider
);

// It's necessary to pass in this argument since the DelegateProxy
// uses delegatecall which ethers can't estimate gas for.
const APPROXIMATE_ERC20_TRANSFER_GAS = 75000;
const APPROXIMATE_ERC20_TRANSFER_10_GAS = 425000;

contract("Transfer", (accounts: string[]) => {
  let unlockedAccount: ethers.providers.JsonRpcSigner;

  let transfer: ethers.Contract;
  let delegateProxy: ethers.Contract;
  let dolphinCoin: ethers.Contract;

  enum AssetType {
    ETH,
    ERC20,
    ANY
  }

  // @ts-ignore
  before(async () => {
    unlockedAccount = await provider.getSigner(accounts[0]);

    const exampleTransfer = await artifacts.require("ExampleTransfer");
    const delegateProxyArtifact = artifacts.require("DelegateProxy");
    const dolphinCoinArtifact = artifacts.require("DolphinCoin");

    exampleTransfer.link(artifacts.require("Transfer"));

    transfer = new ethers.Contract(
      (await exampleTransfer.new()).address,
      exampleTransfer.abi,
      unlockedAccount
    );

    delegateProxy = new ethers.Contract(
      (await delegateProxyArtifact.new()).address,
      delegateProxyArtifact.abi,
      unlockedAccount
    );

    dolphinCoin = new ethers.Contract(
      (await dolphinCoinArtifact.new()).address,
      dolphinCoinArtifact.abi,
      unlockedAccount
    );
  });

  describe("Executes delegated transfers for ETH", () => {
    beforeEach(async () => {
      await unlockedAccount.sendTransaction({
        to: delegateProxy.address,
        value: ethers.utils.parseEther("1")
      });
    });

    it("for 1 address", async () => {
      const randomTarget = randomETHAddress();

      const details = {
        value: [ethers.utils.parseEther("1")],
        assetType: AssetType.ETH,
        to: [randomTarget],
        token: ethers.constants.AddressZero,
        data: []
      };

      await delegateProxy.functions.delegate(
        transfer.address,
        transfer.interface.functions.transfer.encode([details]),
        { gasLimit: APPROXIMATE_ERC20_TRANSFER_GAS }
      );

      const balTarget = await provider.getBalance(randomTarget);

      expect(balTarget.toString()).to.deep.equal(
        ethers.utils.parseEther("1").toString()
      );
    });

    it("for many addresses", async () => {
      const randomTargets: string[] = Array.from({ length: 10 }, () =>
        randomETHAddress()
      );

      const details = {
        value: randomTargets.map(_ => ethers.utils.parseEther("1").div(10)),
        assetType: AssetType.ETH,
        to: randomTargets,
        token: ethers.constants.AddressZero,
        data: []
      };

      await delegateProxy.functions.delegate(
        transfer.address,
        transfer.interface.functions.transfer.encode([details]),
        { gasLimit: APPROXIMATE_ERC20_TRANSFER_10_GAS }
      );

      for (const target of randomTargets) {
        const bal = await provider.getBalance(target);
        expect(bal.toString()).to.deep.equal(
          ethers.utils
            .parseEther("1")
            .div(10)
            .toString()
        );
      }
    });
  });

  describe("Executes delegated transfers for ERC20", () => {
    beforeEach(async () => {
      await dolphinCoin.functions.transfer(delegateProxy.address, 10);
    });

    it("for 1 address", async () => {
      const randomTarget = randomETHAddress();

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
        { gasLimit: APPROXIMATE_ERC20_TRANSFER_GAS }
      );

      const balTarget = await dolphinCoin.functions.balanceOf(randomTarget);

      expect(balTarget).to.be.eql(new ethers.utils.BigNumber(10));
    });

    it("for many addresses", async () => {
      const randomTargets: string[] = Array.from({ length: 10 }, () =>
        randomETHAddress()
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
        { gasLimit: APPROXIMATE_ERC20_TRANSFER_10_GAS }
      );

      for (const target of randomTargets) {
        const bal = await dolphinCoin.functions.balanceOf(target);
        expect(bal).to.be.eql(new ethers.utils.BigNumber(1));
      }
    });
  });
});
