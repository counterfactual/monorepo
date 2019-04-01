import { utils } from "@counterfactual/cf.js";
import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { AddressZero, HashZero } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import { hexlify, keccak256, randomBytes, SigningKey } from "ethers/utils";

import AppRegistry from "../build/AppRegistry.json";

import {
  AppInstance,
  AssetType,
  computeAppChallengeHash,
  expect,
  Terms
} from "./utils";
const { signaturesToBytesSortedBySignerAddress } = utils;

const ALICE =
  // 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
  new Wallet(
    "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27"
  );

const BOB =
  // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
  new Wallet(
    "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"
  );

// HELPER DATA
const ONCHAIN_CHALLENGE_TIMEOUT = 30;

describe("AppRegistry", () => {
  let provider: Web3Provider;
  let wallet: Wallet;
  let wallet2: Wallet;

  let appRegistry: Contract;

  let setStateAsOwner: (nonce: number, appState?: string) => Promise<void>;
  let setStateWithSignatures: (
    nonce: number,
    appState?: string
  ) => Promise<void>;
  let cancelChallenge: () => Promise<void>;
  let sendSignedFinalizationToChain: () => Promise<any>;
  let latestAppState: () => Promise<string>;
  let latestNonce: () => Promise<number>;
  let isStateFinalized: () => Promise<boolean>;

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];
    wallet2 = (await waffle.getWallets(provider))[1];

    appRegistry = await waffle.deployContract(wallet, AppRegistry, [], {
      gasLimit: 6000000 // override default of 4 million
    });
  });

  beforeEach(async () => {
    const appInstance = new AppInstance(
      wallet.address,
      [ALICE.address, BOB.address],
      hexlify(randomBytes(20)),
      new Terms(AssetType.ETH, 0, AddressZero),
      10
    );

    latestAppState = async () =>
      (await appRegistry.functions.getAppChallenge(appInstance.identityHash))
        .appStateHash;

    latestNonce = async () =>
      (await appRegistry.functions.getAppChallenge(appInstance.identityHash))
        .nonce;

    isStateFinalized = async () =>
      await appRegistry.functions.isStateFinalized(appInstance.identityHash);

    setStateAsOwner = (nonce: number, appState?: string) =>
      appRegistry.functions.setState(appInstance.appIdentity, {
        nonce,
        appStateHash: appState || HashZero,
        timeout: ONCHAIN_CHALLENGE_TIMEOUT,
        signatures: HashZero
      });

    cancelChallenge = () =>
      appRegistry.functions.cancelChallenge(appInstance.appIdentity, HashZero);

    setStateWithSignatures = async (nonce: number, appState?: string) => {
      const stateHash = keccak256(appState || HashZero);
      const digest = computeAppChallengeHash(
        appInstance.identityHash,
        stateHash,
        nonce,
        ONCHAIN_CHALLENGE_TIMEOUT
      );

      const signer1 = new SigningKey(ALICE.privateKey);
      const signature1 = await signer1.signDigest(digest);

      const signer2 = new SigningKey(BOB.privateKey);
      const signature2 = await signer2.signDigest(digest);

      const bytes = signaturesToBytesSortedBySignerAddress(
        digest,
        signature1,
        signature2
      );

      const data = appRegistry.interface.functions.setState.encode([
        appInstance.appIdentity,
        {
          nonce,
          appStateHash: stateHash,
          timeout: ONCHAIN_CHALLENGE_TIMEOUT,
          signatures: bytes
        }
      ]);

      await wallet2.sendTransaction({
        data,
        to: appRegistry.address
      });
    };

    sendSignedFinalizationToChain = async () =>
      appRegistry.functions.setState(appInstance.appIdentity, {
        nonce: (await latestNonce()) + 1,
        appStateHash: await latestAppState(),
        timeout: 0,
        signatures: await wallet.signMessage(
          computeAppChallengeHash(
            appInstance.identityHash,
            await latestAppState(),
            await latestNonce(),
            0
          )
        )
      });
  });

  describe("updating app state", () => {
    describe("with owner", () => {
      it("should work with higher nonce", async () => {
        expect(await latestNonce()).to.eq(0);
        await setStateAsOwner(1);
        expect(await latestNonce()).to.eq(1);
      });

      it("should work many times", async () => {
        expect(await latestNonce()).to.eq(0);
        await setStateAsOwner(1);
        expect(await latestNonce()).to.eq(1);
        await cancelChallenge();
        await setStateAsOwner(2);
        expect(await latestNonce()).to.eq(2);
        await cancelChallenge();
        await setStateAsOwner(3);
        expect(await latestNonce()).to.eq(3);
      });

      it("should work with much higher nonce", async () => {
        expect(await latestNonce()).to.eq(0);
        await setStateAsOwner(1000);
        expect(await latestNonce()).to.eq(1000);
      });

      it("shouldn't work with an equal nonce", async () => {
        await expect(setStateAsOwner(0)).to.be.reverted;
        expect(await latestNonce()).to.eq(0);
      });

      it("shouldn't work with an lower nonce", async () => {
        await setStateAsOwner(1);
        await expect(setStateAsOwner(0)).to.be.reverted;
        expect(await latestNonce()).to.eq(1);
      });
    });

    describe("with signing keys", async () => {
      it("should work with higher nonce", async () => {
        expect(await latestNonce()).to.eq(0);
        await setStateWithSignatures(1);
        expect(await latestNonce()).to.eq(1);
      });

      it("should work many times", async () => {
        expect(await latestNonce()).to.eq(0);
        await setStateWithSignatures(1);
        expect(await latestNonce()).to.eq(1);
        await cancelChallenge();
        await setStateWithSignatures(2);
        expect(await latestNonce()).to.eq(2);
        await cancelChallenge();
        await setStateWithSignatures(3);
        expect(await latestNonce()).to.eq(3);
      });

      it("should work with much higher nonce", async () => {
        expect(await latestNonce()).to.eq(0);
        await setStateWithSignatures(1000);
        expect(await latestNonce()).to.eq(1000);
      });

      it("shouldn't work with an equal nonce", async () => {
        await expect(setStateWithSignatures(0)).to.be.reverted;
        expect(await latestNonce()).to.eq(0);
      });

      it("shouldn't work with a lower nonce", async () => {
        await setStateWithSignatures(1);
        await expect(setStateWithSignatures(0)).to.be.reverted;
        expect(await latestNonce()).to.eq(1);
      });
    });
  });

  describe("finalizing app state", async () => {
    it("should work with keys", async () => {
      expect(await isStateFinalized()).to.be.false;
      await sendSignedFinalizationToChain();
      expect(await isStateFinalized()).to.be.true;
    });
  });

  describe("waiting for timeout", async () => {
    it("should block updates after the timeout", async () => {
      expect(await isStateFinalized()).to.be.false;

      await setStateAsOwner(1);

      for (const _ of Array(ONCHAIN_CHALLENGE_TIMEOUT + 1)) {
        await provider.send("evm_mine", []);
      }

      expect(await isStateFinalized()).to.be.true;

      await expect(setStateAsOwner(2)).to.be.reverted;

      await expect(setStateWithSignatures(0)).to.be.reverted;
    });
  });

  it("is possible to call setState to put state on-chain", async () => {
    // Test Terms
    const terms = new Terms(AssetType.ETH, 0, AddressZero);

    // Setup AppInstance
    const appInstance = new AppInstance(
      wallet.address,
      [ALICE.address, BOB.address],
      AddressZero,
      terms,
      10
    );

    // Tell the AppRegistry to start timer
    const stateHash = hexlify(randomBytes(32));
    await appRegistry.functions.setState(appInstance.appIdentity, {
      appStateHash: stateHash,
      nonce: 1,
      timeout: 10,
      signatures: HashZero
    });

    // Verify the correct data was put on-chain
    const {
      status,
      latestSubmitter,
      appStateHash,
      disputeCounter,
      disputeNonce,
      finalizesAt,
      nonce
    } = await appRegistry.functions.appChallenges(appInstance.identityHash);

    expect(status).to.be.eq(1);
    expect(latestSubmitter).to.be.eq(await wallet.getAddress());
    expect(appStateHash).to.be.eq(stateHash);
    expect(disputeCounter).to.be.eq(1);
    expect(disputeNonce).to.be.eq(0);
    expect(finalizesAt).to.be.eq((await provider.getBlockNumber()) + 10);
    expect(nonce).to.be.eq(1);
  });
});
