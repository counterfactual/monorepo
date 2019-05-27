import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { HashZero, One, Zero } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import {
  BigNumber,
  bigNumberify,
  defaultAbiCoder,
  keccak256,
  solidityKeccak256
} from "ethers/utils";

import ChallengeRegistry from "../build/ChallengeRegistry.json";
import DelegateProxy from "../build/DelegateProxy.json";
import FixedTwoPartyOutcomeApp from "../build/FixedTwoPartyOutcomeApp.json";
import NonceRegistry from "../build/NonceRegistry.json";
import TwoPartyVirtualEthAsLump from "../build/TwoPartyVirtualEthAsLump.json";

import { expect } from "./utils/index";

describe("TwoPartyVirtualEthAsLump", () => {
  let provider: Web3Provider;
  let wallet: Wallet;

  let appRegistry: Contract;
  let nonceRegistry: Contract;
  let virtualAppAgreement: Contract;
  let fixedTwoPartyOutcome: Contract;
  let appIdentityHash: string;

  /// Deploys a new DelegateProxy instance, funds it, and delegatecalls to
  /// FixedTwoPartyOutcomeApp with random beneficiaries
  const delegatecallVirtualAppAgreement = async (
    virtualAppAgreement: Contract,
    appRegistry: Contract,
    nonceRegistry: Contract,
    appDefinition: string,
    expiry: number,
    capitalProvided: BigNumber,
    uninstallKey: string
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
        uninstallKey,
        expiry,
        capitalProvided,
        registry: appRegistry.address,
        nonceRegistry: nonceRegistry.address,
        appIdentityHash: appDefinition
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

    virtualAppAgreement = await waffle.deployContract(
      wallet,
      TwoPartyVirtualEthAsLump
    );

    appRegistry = await waffle.deployContract(wallet, ChallengeRegistry, [], {
      gasLimit: 6000000 // override default of 4 million
    });

    nonceRegistry = await waffle.deployContract(wallet, NonceRegistry);

    fixedTwoPartyOutcome = await waffle.deployContract(
      wallet,
      FixedTwoPartyOutcomeApp
    );

    const appIdentity = {
      owner: await wallet.getAddress(),
      signingKeys: [],
      appDefinition: fixedTwoPartyOutcome.address,
      defaultTimeout: 10
    };

    appIdentityHash = keccak256(
      defaultAbiCoder.encode(
        [
          `tuple(
            address owner,
            address[] signingKeys,
            address appDefinition,
            uint256 defaultTimeout
          )`
        ],
        [appIdentity]
      )
    );

    await appRegistry.functions.setState(appIdentity, {
      appStateHash: keccak256(HashZero),
      nonce: 1,
      timeout: 0,
      signatures: HashZero
    });

    // Can be called immediately without waiting for blocks to be mined
    // because the timeout was set to 0 in the previous call to setState
    await appRegistry.functions.setOutcome(appIdentity, HashZero);
  });

  it("succeeds with a valid outcome and elapsed lockup period", async () => {
    const beneficiaries = await delegatecallVirtualAppAgreement(
      virtualAppAgreement,
      appRegistry,
      nonceRegistry,
      appIdentityHash,
      0,
      bigNumberify(10),
      HashZero
    );

    expect(await provider.getBalance(beneficiaries[0])).to.eq(bigNumberify(5));
    expect(await provider.getBalance(beneficiaries[1])).to.eq(bigNumberify(5));
  });

  it("fails with invalid outcome target", async () => {
    await expect(
      delegatecallVirtualAppAgreement(
        virtualAppAgreement,
        appRegistry,
        nonceRegistry,
        HashZero,
        0,
        bigNumberify(10),
        HashZero
      )
    ).to.be.reverted;
  });

  it("fails if called before agreement expiry", async () => {
    await expect(
      delegatecallVirtualAppAgreement(
        virtualAppAgreement,
        appRegistry,
        nonceRegistry,
        appIdentityHash,
        (await provider.getBlockNumber()) + 10,
        bigNumberify(10),
        HashZero
      )
    ).to.be.revertedWith("Delegate call failed.");
  });

  it("fails if cancelled", async () => {
    const computeKey = (sender: string, timeout: BigNumber, salt: string) =>
      solidityKeccak256(
        ["address", "uint256", "bytes32"],
        [sender, timeout, salt]
      );

    await nonceRegistry.functions.setNonce(Zero, HashZero, One);
    await expect(
      delegatecallVirtualAppAgreement(
        virtualAppAgreement,
        appRegistry,
        nonceRegistry,
        appIdentityHash,
        0,
        bigNumberify(10),
        computeKey(wallet.address, Zero, HashZero)
      )
    ).to.be.revertedWith("Delegate call failed.");
  });
});
