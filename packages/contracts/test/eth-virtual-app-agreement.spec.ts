import { Contract, ContractFactory, Wallet } from "ethers";
import { AddressZero, HashZero } from "ethers/constants";
import { JsonRpcSigner, Web3Provider } from "ethers/providers";
import {
  BigNumber,
  bigNumberify,
  defaultAbiCoder,
  keccak256
} from "ethers/utils";

import { expect } from "./utils/index";

const provider = new Web3Provider((global as any).web3.currentProvider);

contract("ETHVirtualAppAgreement", (accounts: string[]) => {
  let unlockedAccount: JsonRpcSigner;

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
    const delegateProxy = await new ContractFactory(
      artifacts.require("DelegateProxy").abi,
      artifacts.require("DelegateProxy").binary,
      unlockedAccount
    ).deploy({ gasLimit: 6e9 });

    await delegateProxy.deployed();

    await unlockedAccount.sendTransaction({
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
      artifacts.require("ResolveToPay5WeiApp").abi,
      artifacts.require("ResolveToPay5WeiApp").binary,
      unlockedAccount
    ).deploy({ gasLimit: 6e9 });

    await appRegistry.deployed();
    await virtualAppAgreement.deployed();
    await fixedResolutionApp.deployed();

    const appInterface = {
      addr: fixedResolutionApp.address,
      getTurnTaker: "0x00000000",
      applyAction: "0x00000000",
      resolve: fixedResolutionApp.interface.functions.resolve.sighash,
      isStateTerminal: "0x00000000"
    };

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
      owner: await unlockedAccount.getAddress(),
      signingKeys: [],
      appInterfaceHash: keccak256(
        defaultAbiCoder.encode(
          [
            `tuple(
              address addr,
              bytes4 getTurnTaker,
              bytes4 applyAction,
              bytes4 resolve,
              bytes4 isStateTerminal
            )`
          ],
          [appInterface]
        )
      ),
      termsHash: keccak256(encodedTerms),
      defaultTimeout: 10
    };

    appIdentityHash = keccak256(
      defaultAbiCoder.encode(
        [
          `tuple(
            address owner,
            address[] signingKeys,
            bytes32 appInterfaceHash,
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
      appInterface,
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
