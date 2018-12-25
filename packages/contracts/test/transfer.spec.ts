import * as waffle from "ethereum-waffle";
import { Contract, ethers } from "ethers";

import DelegateProxy from "../build/DelegateProxy.json";
import DolphinCoin from "../build/DolphinCoin.json";
import ExampleTransfer from "../build/ExampleTransfer.json";
import Transfer from "../build/Transfer.json";

import { expect } from "./utils";

const { hexlify, randomBytes } = ethers.utils;
const { WeiPerEther, AddressZero } = ethers.constants;

// It's necessary to pass in this argument since the DelegateProxy
// uses delegatecall which ethers can't estimate gas for.
const APPROXIMATE_ERC20_TRANSFER_GAS = 75000;
const APPROXIMATE_ERC20_TRANSFER_10_GAS = 425000;

describe("Transfer", () => {
  let provider: ethers.providers.Web3Provider;
  let wallet: ethers.Wallet;

  let exampleTransfer: Contract;
  let delegateProxy: Contract;
  let dolphinCoin: Contract;

  enum AssetType {
    ETH,
    ERC20,
    ANY
  }

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    const transfer = await waffle.deployContract(wallet, Transfer);
    waffle.link(ExampleTransfer, "Transfer", transfer.address);

    exampleTransfer = await waffle.deployContract(wallet, ExampleTransfer);
    delegateProxy = await waffle.deployContract(wallet, DelegateProxy);
    dolphinCoin = await waffle.deployContract(wallet, DolphinCoin);
  });

  describe("Executes delegated transfers for ETH", () => {
    beforeEach(async () => {
      await wallet.sendTransaction({
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
