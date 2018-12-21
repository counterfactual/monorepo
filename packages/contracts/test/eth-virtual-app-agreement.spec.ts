import { expect } from "chai";
import { Contract, ContractFactory, Wallet } from "ethers";
import { AddressZero, HashZero } from "ethers/constants";
import { JsonRpcSigner, Web3Provider } from "ethers/providers";
import { BigNumber, parseEther } from "ethers/utils";

const provider = new Web3Provider((global as any).web3.currentProvider);

contract("ETHVirtualAppAgreement", (accounts: string[]) => {
  let unlockedAccount: JsonRpcSigner;

  let appRegistry: Contract;
  let virtualAppAgreement: Contract;
  let fixedResolutionApp: Contract;

  /// Deploys a new DelegateProxy instance, funds it, and delegatecalls to
  /// FixedResolutionApp with random beneficiaries
  const delegatecallVirtualAppAgreement = async (
    virtualAppAgreement: Contract,
    appRegistry: Contract,
    resolutionAddr: string,
    expiry: number,
    capitalProvided: BigNumber,
    assetType: number
  ): Promise<string[]> => {
    const delegateProxy = await new ContractFactory(
      artifacts.require("DelegateProxy").abi,
      artifacts.require("DelegateProxy").binary,
      unlockedAccount
    ).deploy({ gasLimit: 6e9 });

    await delegateProxy.deployed();

    await unlockedAccount.sendTransaction({
      to: delegateProxy.address,
      value: parseEther("0.0100")
    });

    const beneficiaries = [
      Wallet.createRandom().address,
      Wallet.createRandom().address
    ];

    const tx = virtualAppAgreement.interface.functions.delegateTarget.encode([
      {
        beneficiaries,
        expiry,
        capitalProvided,
        appRegistry: appRegistry.address,
        terms: {
          assetType,
          limit: 0,
          token: AddressZero
        },
        appInstanceId: resolutionAddr
      }
    ]);

    expect(await provider.getBalance(beneficiaries[0])).to.eq(0);
    expect(await provider.getBalance(beneficiaries[1])).to.eq(0);

    await delegateProxy.functions.delegate(virtualAppAgreement.address, tx, {
      gasLimit: 150000
    });

    return beneficiaries;
  };

  before(async () => {
    unlockedAccount = await provider.getSigner(accounts[0]);

    const artifact1 = artifacts.require("ETHVirtualAppAgreement");
    artifact1.link(artifacts.require("Transfer"));

    virtualAppAgreement = await new ContractFactory(
      artifact1.abi,
      artifact1.binary,
      unlockedAccount
    ).deploy({ gasLimit: 6e9 });

    const artifact2 = artifacts.require("AppRegistry");
    artifact2.link(artifacts.require("LibStaticCall"));
    artifact2.link(artifacts.require("Transfer"));

    appRegistry = await await new ContractFactory(
      artifact2.abi,
      artifact2.binary,
      unlockedAccount
    ).deploy({ gasLimit: 6e9 });

    await appRegistry.deployed();

    fixedResolutionApp = await new ContractFactory(
      artifacts.require("ResolveToPay5ETHApp").abi,
      artifacts.require("ResolveToPay5ETHApp").binary,
      unlockedAccount
    ).deploy({ gasLimit: 6e9 });

    await appRegistry.deployed();
    await virtualAppAgreement.deployed();
    await fixedResolutionApp.deployed();
  });

  describe("ETHVirtualAppAgreement", () => {
    it("succeeds with a valid resolution and elapsed lockup period", async () => {
      const beneficiaries = await delegatecallVirtualAppAgreement(
        virtualAppAgreement,
        appRegistry,
        fixedResolutionApp.cfAddress,
        0,
        parseEther("0.010"),
        0
      );
      expect(await provider.getBalance(beneficiaries[0])).to.eq(
        parseEther("0.05")
      );
      expect(await provider.getBalance(beneficiaries[1])).to.eq(
        parseEther("0.05")
      );
    });

    it("fails with invalid resolution target", async () => {
      await expect(
        delegatecallVirtualAppAgreement(
          virtualAppAgreement,
          appRegistry,
          HashZero,
          0,
          parseEther("0.010"),
          0
        )
      ).to.be.reverted;
    });

    it("fails if called before agreement expiry", async () => {
      await expect(
        delegatecallVirtualAppAgreement(
          virtualAppAgreement,
          appRegistry,
          fixedResolutionApp.cfAddress,
          (await provider.getBlockNumber()) + 10,
          parseEther("0.010"),
          0
        )
      ).to.be.reverted;
    });

    it("fails if resolution value is larger than capital provided", async () => {
      await expect(
        delegatecallVirtualAppAgreement(
          virtualAppAgreement,
          appRegistry,
          fixedResolutionApp.cfAddress,
          0,
          parseEther("0.02"),
          0
        )
      ).to.be.reverted;
    });

    it("fails if resolution returns different token type", async () => {
      await expect(
        delegatecallVirtualAppAgreement(
          virtualAppAgreement,
          appRegistry,
          fixedResolutionApp.cfAddress,
          0,
          parseEther("0.010"),
          1
        )
      ).to.be.reverted;
    });
  });
});
