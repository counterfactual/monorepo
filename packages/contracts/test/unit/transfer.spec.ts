import { expect } from "chai";
import { ethers } from "ethers";
import lodash = require("lodash");

import { AbstractContract } from "../../utils/contract";
import * as Utils from "../../utils/misc";

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

  // @ts-ignore
  before(async () => {
    const transferArtifact = AbstractContract.fromArtifactName("Transfer");
    const exampleTransfer = await AbstractContract.fromArtifactName(
      "ExampleTransfer",
      {
        Transfer: transferArtifact
      }
    );
    const delegateProxyArtifact = await AbstractContract.fromArtifactName(
      "DelegateProxy"
    );
    const dolphinCoinArtifact = await AbstractContract.fromArtifactName(
      "DolphinCoin"
    );
    transfer = await exampleTransfer.deploy(unlockedAccount);
    delegateProxy = await delegateProxyArtifact.deploy(unlockedAccount);
    dolphinCoin = await dolphinCoinArtifact.deploy(unlockedAccount);
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
        token: ethers.constants.AddressZero,
        data: []
      };

      await delegateProxy.functions.delegate(
        transfer.address,
        transfer.interface.functions.transfer.encode([details]),
        Utils.HIGH_GAS_LIMIT
      );

      const balTarget = await provider.getBalance(randomTarget);

      expect(balTarget.toString()).to.deep.equal(Utils.UNIT_ETH.toString());
    });

    it("for many addresses", async () => {
      const randomTargets: string[] = Array.from({ length: 10 }, () =>
        Utils.randomETHAddress()
      );

      const details = {
        value: randomTargets.map(_ => Utils.UNIT_ETH.div(10)),
        assetType: AssetType.ETH,
        to: randomTargets,
        token: ethers.constants.AddressZero,
        data: []
      };

      await delegateProxy.functions.delegate(
        transfer.address,
        transfer.interface.functions.transfer.encode([details]),
        Utils.HIGH_GAS_LIMIT
      );

      lodash.times(10, async (i: number) => {
        const bal = await provider.getBalance(randomTargets[i]);
        expect(bal.toString()).to.deep.equal(Utils.UNIT_ETH.div(10).toString());
      });
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

      expect(balTarget).to.be.eql(new ethers.utils.BigNumber(10));
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

      lodash.times(10, async (i: number) => {
        const bal = await dolphinCoin.functions.balanceOf(randomTargets[i]);
        expect(bal).to.be.eql(new ethers.utils.BigNumber(1));
      });
    });
  });
});
