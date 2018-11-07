import * as ethers from "ethers";

import * as Utils from "../../utils/misc";

const web3 = (global as any).web3;
const { unlockedAccount } = Utils.setupTestEnv(web3);

import { AbstractContract, buildArtifacts, expect } from "../../utils";

contract("Virtual App", (accounts: string[]) => {
  let virtualAppAgreement: ethers.Contract;
  let registry: ethers.Contract;
  let delegateProxy: ethers.Contract;

  // @ts-ignore
  before(async () => {
    virtualAppAgreement = await (await buildArtifacts.VirtualAppAgreement).deploy(
      unlockedAccount
    );
    registry = await (await buildArtifacts.Registry).deploy(unlockedAccount);
    delegateProxy = await (await AbstractContract.fromArtifactName(
      "DelegateProxy"
    )).deploy(unlockedAccount);
  });

  describe("ETHVirtualAppAgreement", () => {
    it("succeeds with a valid resolution and elapsed lockup period", async () => {
      const fixedResolutionApp = await (await AbstractContract.fromArtifactName(
        "ResolveToPay5ETHApp",
        {
          Transfer: buildArtifacts.Transfer
        }
      )).deployViaRegistry(unlockedAccount, registry);

      await unlockedAccount.sendTransaction({
        to: delegateProxy.address,
        value: ethers.utils.parseEther("100")
      });

      const beneficiaries = [
        ethers.Wallet.createRandom().address,
        ethers.Wallet.createRandom().address
      ];

      const tx = virtualAppAgreement.interface.functions.delegateTarget.encode([
        {
          beneficiaries,
          registry: registry.address,
          terms: {
            assetType: 0,
            limit: 0,
            token: ethers.constants.AddressZero
          },
          expiry: 0,
          target: fixedResolutionApp.cfAddress,
          capitalProvided: ethers.utils.parseEther("10")
        }
      ]);

      expect(
        (await unlockedAccount.provider.getBalance(beneficiaries[0])).toString()
      ).to.eq("0");
      expect(
        (await unlockedAccount.provider.getBalance(beneficiaries[1])).toString()
      ).to.eq("0");

      await delegateProxy.functions.delegate(
        virtualAppAgreement.address,
        tx,
        Utils.HIGH_GAS_LIMIT
      );

      expect(
        (await unlockedAccount.provider.getBalance(beneficiaries[0])).toString()
      ).to.eq(ethers.utils.parseEther("5").toString());
      expect(
        (await unlockedAccount.provider.getBalance(beneficiaries[1])).toString()
      ).to.eq(ethers.utils.parseEther("5").toString());
    });
  });
});
