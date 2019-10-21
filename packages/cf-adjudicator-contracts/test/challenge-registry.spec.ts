import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { HashZero } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import {
  BigNumberish,
  hexlify,
  joinSignature,
  keccak256,
  randomBytes,
  SigningKey
} from "ethers/utils";

import ChallengeRegistry from "../expected-build-artifacts/ChallengeRegistry.json";

import {
  AppIdentityTestClass,
  computeAppChallengeHash,
  expect,
  sortSignaturesBySignerAddress
} from "./utils";

type Challenge = {
  status: 0 | 1 | 2;
  latestSubmitter: string;
  appStateHash: string;
  challengeCounter: number;
  finalizesAt: number;
  versionNumber: number;
};

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

describe("ChallengeRegistry", () => {
  let provider: Web3Provider;
  let wallet: Wallet;
  let globalChannelNonce = 0;

  let appRegistry: Contract;

  let setStateWithSignatures: (
    versionNumber: BigNumberish,
    appState?: string,
    timeout?: number
  ) => Promise<void>;
  let cancelChallenge: () => Promise<void>;
  let sendSignedFinalizationToChain: () => Promise<any>;
  let getChallenge: () => Promise<Challenge>;
  let latestAppStateHash: () => Promise<string>;
  let latestVersionNumber: () => Promise<number>;
  let isStateFinalized: () => Promise<boolean>;

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    appRegistry = await waffle.deployContract(wallet, ChallengeRegistry, [], {
      gasLimit: 6000000 // override default of 4 million
    });
  });

  beforeEach(async () => {
    const appIdentityTestObject = new AppIdentityTestClass(
      [ALICE.address, BOB.address],
      hexlify(randomBytes(20)),
      10,
      globalChannelNonce
    );

    globalChannelNonce += 1;

    getChallenge = () =>
      appRegistry.functions.getAppChallenge(appIdentityTestObject.identityHash);

    latestAppStateHash = async () => (await getChallenge()).appStateHash;

    latestVersionNumber = async () => (await getChallenge()).versionNumber;

    isStateFinalized = async () =>
      await appRegistry.functions.isStateFinalized(
        appIdentityTestObject.identityHash
      );

    cancelChallenge = async () => {
      const digest = computeAppChallengeHash(
        appIdentityTestObject.identityHash,
        await latestAppStateHash(),
        await latestVersionNumber(),
        appIdentityTestObject.defaultTimeout
      );

      await appRegistry.functions.cancelChallenge(
        appIdentityTestObject.appIdentity,
        sortSignaturesBySignerAddress(digest, [
          await new SigningKey(ALICE.privateKey).signDigest(digest),
          await new SigningKey(BOB.privateKey).signDigest(digest)
        ]).map(joinSignature)
      );
    };

    setStateWithSignatures = async (
      versionNumber: BigNumberish,
      appState: string = HashZero,
      timeout: number = ONCHAIN_CHALLENGE_TIMEOUT
    ) => {
      const stateHash = keccak256(appState);
      const digest = computeAppChallengeHash(
        appIdentityTestObject.identityHash,
        stateHash,
        versionNumber,
        timeout
      );
      await appRegistry.functions.setState(appIdentityTestObject.appIdentity, {
        timeout,
        versionNumber,
        appStateHash: stateHash,
        signatures: sortSignaturesBySignerAddress(digest, [
          await new SigningKey(ALICE.privateKey).signDigest(digest),
          await new SigningKey(BOB.privateKey).signDigest(digest)
        ]).map(joinSignature)
      });
    };

    sendSignedFinalizationToChain = async () =>
      await setStateWithSignatures(
        (await latestVersionNumber()) + 1,
        await latestAppStateHash(),
        0
      );
  });

  describe("updating app state", () => {
    describe("with signing keys", async () => {
      it("should work with higher versionNumber", async () => {
        expect(await latestVersionNumber()).to.eq(0);
        await setStateWithSignatures(1);
        expect(await latestVersionNumber()).to.eq(1);
      });

      it("should work many times", async () => {
        expect(await latestVersionNumber()).to.eq(0);
        await setStateWithSignatures(1);
        expect(await latestVersionNumber()).to.eq(1);
        await cancelChallenge();
        await setStateWithSignatures(2);
        expect(await latestVersionNumber()).to.eq(2);
        await cancelChallenge();
        await setStateWithSignatures(3);
        expect(await latestVersionNumber()).to.eq(3);
      });

      it("should work with much higher versionNumber", async () => {
        expect(await latestVersionNumber()).to.eq(0);
        await setStateWithSignatures(1000);
        expect(await latestVersionNumber()).to.eq(1000);
      });

      it("shouldn't work with an equal versionNumber", async () => {
        await expect(setStateWithSignatures(0)).to.be.reverted;
        expect(await latestVersionNumber()).to.eq(0);
      });

      it("shouldn't work with a lower versionNumber", async () => {
        await setStateWithSignatures(1);
        await expect(setStateWithSignatures(0)).to.be.reverted;
        expect(await latestVersionNumber()).to.eq(1);
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

      await setStateWithSignatures(1);

      for (const _ of Array(ONCHAIN_CHALLENGE_TIMEOUT + 1)) {
        await provider.send("evm_mine", []);
      }

      expect(await isStateFinalized()).to.be.true;

      await expect(setStateWithSignatures(2)).to.be.reverted;

      await expect(setStateWithSignatures(0)).to.be.reverted;
    });
  });

  it("is possible to call setState to put state on-chain", async () => {
    // Tell the ChallengeRegistry to start timer
    const state = hexlify(randomBytes(32));

    await setStateWithSignatures(1, state);

    // Verify the correct data was put on-chain
    const {
      status,
      latestSubmitter,
      appStateHash,
      challengeCounter,
      finalizesAt,
      versionNumber
    } = await getChallenge();

    expect(status).to.be.eq(1);
    expect(latestSubmitter).to.be.eq(await wallet.getAddress());
    expect(appStateHash).to.be.eq(keccak256(state));
    expect(challengeCounter).to.be.eq(1);
    expect(finalizesAt).to.be.eq(
      (await provider.getBlockNumber()) + ONCHAIN_CHALLENGE_TIMEOUT
    );
    expect(versionNumber).to.be.eq(1);
  });
});
