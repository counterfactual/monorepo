import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { AddressZero, HashZero } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import {
  BigNumber,
  bigNumberify,
  defaultAbiCoder,
  keccak256
} from "ethers/utils";

import AppRegistry from "../build/AppRegistry.json";
import DelegateProxy from "../build/DelegateProxy.json";
import ETHVirtualAppAgreement from "../build/ETHVirtualAppAgreement.json";
import ResolveToPay5WeiApp from "../build/ResolveToPay5WeiApp.json";
import Transfer from "../build/Transfer.json";

import { expect } from "./utils/index";

describe("ETHVirtualAppAgreement", () => {
  let provider: Web3Provider;
  let wallet: Wallet;

  let appRegistry: Contract;
  let virtualAppAgreement: Contract;
  let fixedResolutionApp: Contract;
  let appIdentityHash: string;

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
    const delegateProxy = await waffle.deployContract(wallet, DelegateProxy);

    await wallet.sendTransaction({
      to: delegateProxy.address,
      value: bigNumberify(100)
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
        registry: appRegistry.address,
        terms: {
          assetType,
          limit: 0,
          token: AddressZero
        },
        appIdentityHash: resolutionAddr
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
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    const transfer = await waffle.deployContract(wallet, Transfer);

    waffle.link(
      ETHVirtualAppAgreement,
      "contracts/libs/Transfer.sol:Transfer",
      transfer.address
    );

    virtualAppAgreement = await waffle.deployContract(
      wallet,
      ETHVirtualAppAgreement
    );

    appRegistry = await waffle.deployContract(wallet, AppRegistry);

    fixedResolutionApp = await waffle.deployContract(
      wallet,
      ResolveToPay5WeiApp
    );

    const terms = {
      assetType: 0,
      limit: 0,
      token: AddressZero
    };

    const encodedTerms = defaultAbiCoder.encode(
      [
        `tuple(
          uint8 assetType,
          uint256 limit,
          address token
        )`
      ],
      [terms]
    );

    const appIdentity = {
      owner: await wallet.getAddress(),
      signingKeys: [],
      appDefinitionAddress: fixedResolutionApp.address,
      termsHash: keccak256(encodedTerms),
      defaultTimeout: 10
    };

    appIdentityHash = keccak256(
      defaultAbiCoder.encode(
        [
          `tuple(
            address owner,
            address[] signingKeys,
            address appDefinitionAddress,
            bytes32 termsHash,
            uint256 defaultTimeout
          )`
        ],
        [appIdentity]
      )
    );

    await appRegistry.functions.setState(appIdentity, {
      stateHash: keccak256(HashZero),
      nonce: 1,
      timeout: 0,
      signatures: HashZero
    });

    // Can be called immediately without waiting for blocks to be mined
    // because the timeout was set to 0 in the previous call to setState
    await appRegistry.functions.setResolution(
      appIdentity,
      HashZero,
      encodedTerms
    );
  });

  describe("ETHVirtualAppAgreement", () => {
    // TODO: This test should work after having done setResolution above but hard not
    //       been finished yet. Leaving it here as skipped until we implement it.
    it.skip("succeeds with a valid resolution and elapsed lockup period", async () => {
      const beneficiaries = await delegatecallVirtualAppAgreement(
        virtualAppAgreement,
        appRegistry,
        appIdentityHash,
        0,
        bigNumberify(10),
        0
      );
      expect(await provider.getBalance(beneficiaries[0])).to.eq(
        bigNumberify(5)
      );
      expect(await provider.getBalance(beneficiaries[1])).to.eq(
        bigNumberify(5)
      );
    });

    it("fails with invalid resolution target", async () => {
      await expect(
        delegatecallVirtualAppAgreement(
          virtualAppAgreement,
          appRegistry,
          HashZero,
          0,
          bigNumberify(10),
          0
        )
      ).to.be.reverted;
    });

    it("fails if called before agreement expiry", async () => {
      await expect(
        delegatecallVirtualAppAgreement(
          virtualAppAgreement,
          appRegistry,
          appIdentityHash,
          (await provider.getBlockNumber()) + 10,
          bigNumberify(10),
          0
        )
      ).to.be.revertedWith("Delegate call failed.");
    });

    it("fails if resolution value is larger than capital provided", async () => {
      await expect(
        delegatecallVirtualAppAgreement(
          virtualAppAgreement,
          appRegistry,
          appIdentityHash,
          0,
          bigNumberify(2),
          0
        )
      ).to.be.revertedWith("Delegate call failed.");
    });

    it("fails if resolution returns different token type", async () => {
      await expect(
        delegatecallVirtualAppAgreement(
          virtualAppAgreement,
          appRegistry,
          appIdentityHash,
          0,
          bigNumberify(10),
          1
        )
      ).to.be.revertedWith("Delegate call failed.");
    });
  });
});
