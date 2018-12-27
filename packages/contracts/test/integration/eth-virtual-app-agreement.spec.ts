import { Contract, Wallet } from "ethers";
import { AddressZero, HashZero } from "ethers/constants";
import { BigNumber, parseEther } from "ethers/utils";

import { AbstractContract, buildArtifacts, expect } from "../../utils";
import * as Utils from "../../utils/misc";

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

/// Deploys a new DelegateProxy instance, funds it, and delegatecalls to
/// FixedResolutionApp with random beneficiaries
const delegatecallVirtualAppAgreement = async (
  virtualAppAgreement: Contract,
  registry: Contract,
  resolutionAddr: string,
  expiry: number,
  capitalProvided: BigNumber,
  assetType: number
): Promise<string[]> => {
  const delegateProxy = await (await AbstractContract.fromArtifactName(
    "DelegateProxy"
  )).deploy(unlockedAccount);

  await unlockedAccount.sendTransaction({
    to: delegateProxy.address,
    value: parseEther("100")
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
      registry: registry.address,
      terms: {
        assetType,
        limit: 0,
        token: AddressZero
      },
      target: resolutionAddr
    }
  ]);

  expect(
    (await unlockedAccount.provider.getBalance(beneficiaries[0])).toString()
  ).to.eq("0");
  expect(
    (await unlockedAccount.provider.getBalance(beneficiaries[1])).toString()
  ).to.eq("0");

  await delegateProxy.functions.delegate(virtualAppAgreement.address, tx, {
    gasLimit: 150000
  });
  return beneficiaries;
};

contract("Virtual App", (accounts: string[]) => {
  let virtualAppAgreement: Contract;
  let registry: Contract;
  let fixedResolutionApp: Contract;

  // @ts-ignore
  before(async () => {
    virtualAppAgreement = await (await buildArtifacts.VirtualAppAgreement).deploy(
      unlockedAccount
    );
    registry = await (await buildArtifacts.Registry).deploy(unlockedAccount);
    fixedResolutionApp = await (await AbstractContract.fromArtifactName(
      "ResolveToPay5ETHApp",
      {
        Transfer: buildArtifacts.Transfer
      }
    )).deployViaRegistry(unlockedAccount, registry);
  });

  describe("ETHVirtualAppAgreement", () => {
    it("succeeds with a valid resolution and elapsed lockup period", async () => {
      const beneficiaries = await delegatecallVirtualAppAgreement(
        virtualAppAgreement,
        registry,
        fixedResolutionApp.cfAddress,
        0,
        parseEther("10"),
        0
      );
      expect(
        (await unlockedAccount.provider.getBalance(beneficiaries[0])).toString()
      ).to.eq(parseEther("5").toString());
      expect(
        (await unlockedAccount.provider.getBalance(beneficiaries[1])).toString()
      ).to.eq(parseEther("5").toString());
    });
    it("fails with invalid resolution target", async () => {
      await Utils.assertRejects(
        delegatecallVirtualAppAgreement(
          virtualAppAgreement,
          registry,
          HashZero,
          0,
          parseEther("10"),
          0
        )
      );
    });
    it("fails if called before agreement expiry", async () => {
      await Utils.assertRejects(
        delegatecallVirtualAppAgreement(
          virtualAppAgreement,
          registry,
          fixedResolutionApp.cfAddress,
          (await provider.getBlockNumber()) + 10,
          parseEther("10"),
          0
        )
      );
    });
    it("fails if resolution value is larger than capital provided", async () => {
      await Utils.assertRejects(
        delegatecallVirtualAppAgreement(
          virtualAppAgreement,
          registry,
          fixedResolutionApp.cfAddress,
          0,
          parseEther("2"),
          0
        )
      );
    });
    it("fails if resolution returns different token type", async () => {
      await Utils.assertRejects(
        delegatecallVirtualAppAgreement(
          virtualAppAgreement,
          registry,
          fixedResolutionApp.cfAddress,
          0,
          parseEther("10"),
          1
        )
      );
    });
  });
});
