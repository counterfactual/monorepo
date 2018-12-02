import { expect } from "chai";
import { ethers } from "ethers";

const { hexlify, randomBytes } = ethers.utils;
const { WeiPerEther, AddressZero } = ethers.constants;

const provider = new ethers.providers.Web3Provider(
  (global as any).web3.currentProvider
);

// It's necessary to pass in this argument since the DelegateProxy
// uses delegatecall which ethers can't estimate gas for.
const APPROXIMATE_ERC20_TRANSFER_GAS = 75000;
const APPROXIMATE_ERC20_TRANSFER_10_GAS = 425000;

contract("Transfer", (accounts: string[]) => {
  let unlockedAccount: ethers.providers.JsonRpcSigner;

  let exampleTransfer: ethers.Contract;
  let delegateProxy: ethers.Contract;
  let dolphinCoin: ethers.Contract;

  enum AssetType {
    ETH,
    ERC20,
    ANY
  }

  before(async () => {
    unlockedAccount = await provider.getSigner(accounts[0]);

    const exampleTransferArtifact = await artifacts.require("ExampleTransfer");
    exampleTransferArtifact.link(artifacts.require("Transfer"));
    exampleTransfer = new ethers.Contract(
      (await exampleTransferArtifact.new()).address,
      exampleTransferArtifact.abi,
      unlockedAccount
    );

    delegateProxy = await new ethers.ContractFactory(
      artifacts.require("DelegateProxy").abi,
      artifacts.require("DelegateProxy").bytecode,
      unlockedAccount
    ).deploy();

    dolphinCoin = await new ethers.ContractFactory(
      artifacts.require("DolphinCoin").abi,
      artifacts.require("DolphinCoin").bytecode,
      unlockedAccount
    ).deploy();
  });

  describe("Executes delegated transfers for ETH", () => {
    beforeEach(async () => {
      await unlockedAccount.sendTransaction({
        to: delegateProxy.address,
        value: WeiPerEther
      });
    });

    it("for 1 address", async () => {
      const randomTarget = hexlify(randomBytes(20));

      const details = {
        value: [WeiPerEther],
        assetType: AssetType.ETH,
        to: [randomTarget],
        token: AddressZero,
        data: []
      };

      await delegateProxy.functions.delegate(
        exampleTransfer.address,
        exampleTransfer.interface.functions.transfer.encode([details]),
        { gasLimit: APPROXIMATE_ERC20_TRANSFER_GAS }
      );

      const balTarget = await provider.getBalance(randomTarget);

      expect(balTarget).to.eq(WeiPerEther);
    });

    it("for many addresses", async () => {
      const randomTargets = Array.from({ length: 10 }, () =>
        hexlify(randomBytes(20))
      );

      const details = {
        value: Array(10).fill(WeiPerEther.div(10)),
        assetType: AssetType.ETH,
        to: randomTargets,
        token: AddressZero,
        data: []
      };

      await delegateProxy.functions.delegate(
        exampleTransfer.address,
        exampleTransfer.interface.functions.transfer.encode([details]),
        { gasLimit: APPROXIMATE_ERC20_TRANSFER_10_GAS }
      );

      for (const target of randomTargets) {
        const bal = await provider.getBalance(target);
        expect(bal).to.eq(WeiPerEther.div(10));
      }
    });
  });

  describe("Executes delegated transfers for ERC20", () => {
    beforeEach(async () => {
      await dolphinCoin.functions.transfer(delegateProxy.address, 10);
    });

    it("for 1 address", async () => {
      const randomTarget = hexlify(randomBytes(20));

      const details = {
        value: [10],
        assetType: AssetType.ERC20,
        to: [randomTarget],
        token: dolphinCoin.address,
        data: []
      };

      await delegateProxy.functions.delegate(
        exampleTransfer.address,
        exampleTransfer.interface.functions.transfer.encode([details]),
        { gasLimit: APPROXIMATE_ERC20_TRANSFER_GAS }
      );

      const balTarget = await dolphinCoin.functions.balanceOf(randomTarget);

      expect(balTarget).to.eq(10);
    });

    it("for many addresses", async () => {
      const randomTargets = Array.from({ length: 10 }, () =>
        hexlify(randomBytes(20))
      );

      const details = {
        value: Array(10).fill(1),
        assetType: AssetType.ERC20,
        to: randomTargets,
        token: dolphinCoin.address,
        data: []
      };

      await delegateProxy.functions.delegate(
        exampleTransfer.address,
        exampleTransfer.interface.functions.transfer.encode([details]),
        { gasLimit: APPROXIMATE_ERC20_TRANSFER_10_GAS }
      );

      for (const target of randomTargets) {
        const bal = await dolphinCoin.functions.balanceOf(target);
        expect(bal).to.eq(1);
      }
    });
  });
});
