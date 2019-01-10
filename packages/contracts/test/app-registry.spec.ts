import { Contract, ContractFactory } from "ethers";
import { AddressZero, HashZero } from "ethers/constants";
import { JsonRpcSigner, Web3Provider } from "ethers/providers";
import { hexlify, randomBytes } from "ethers/utils";

import { ALICE, BOB } from "./constants";
import {
  AppInstance,
  AssetType,
  computeStateHash,
  expect,
  Terms
} from "./utils";

// HELPER DATA
const ONCHAIN_CHALLENGE_TIMEOUT = 30;

contract("AppRegistry", (accounts: string[]) => {
  let provider: Web3Provider;
  let wallet: JsonRpcSigner;
  let appRegistry: Contract;

  let setStateAsOwner: (nonce: number, appState?: string) => Promise<void>;
  let setStateWithSignatures: (
    nonce: number,
    appState?: string
  ) => Promise<void>;
  let cancelChallenge: () => Promise<void>;
  let sendSignedFinalizationToChain: () => Promise<any>;
  let latestState: () => Promise<string>;
  let latestNonce: () => Promise<number>;
  let isStateFinalized: () => Promise<boolean>;

  before(async () => {
    provider = new Web3Provider((global as any).web3.currentProvider);

    wallet = await provider.getSigner(accounts[0]);

    const artifact = artifacts.require("AppRegistry");
    artifact.link(artifacts.require("LibStaticCall"));
    artifact.link(artifacts.require("Transfer"));

    appRegistry = await new ContractFactory(
      artifact.abi,
      artifact.binary,
      wallet
    ).deploy({ gasLimit: 6e9 });

    await appRegistry.deployed();
  });

  beforeEach(async () => {
    const appInstance = new AppInstance(
      accounts[0],
      [ALICE.address, BOB.address],
      hexlify(randomBytes(20)),
      new Terms(AssetType.ETH, 0, AddressZero),
      10
    );

    latestState = async () =>
      (await appRegistry.functions.getAppChallenge(appInstance.identityHash))
        .appStateHash;

    latestNonce = async () =>
      (await appRegistry.functions.getAppChallenge(appInstance.identityHash)).nonce;

    isStateFinalized = async () =>
      await appRegistry.functions.isStateFinalized(appInstance.identityHash);

    setStateAsOwner = (nonce: number, appState?: string) =>
      appRegistry.functions.setState(appInstance.appIdentity, {
        nonce,
        stateHash: appState || HashZero,
        timeout: ONCHAIN_CHALLENGE_TIMEOUT,
        signatures: HashZero
      });

    cancelChallenge = () =>
      appRegistry.functions.cancelChallenge(appInstance.appIdentity, HashZero);

    setStateWithSignatures = async (nonce: number, appState?: string) =>
      appRegistry.functions.setState(appInstance.appIdentity, {
        nonce,
        stateHash: appState || HashZero,
        timeout: ONCHAIN_CHALLENGE_TIMEOUT,
        signatures: await wallet.signMessage(
          computeStateHash(
            appInstance.identityHash,
            appState || HashZero,
            nonce,
            ONCHAIN_CHALLENGE_TIMEOUT
          )
        )
      });

    sendSignedFinalizationToChain = async () =>
      appRegistry.functions.setState(appInstance.appIdentity, {
        nonce: (await latestNonce()) + 1,
        stateHash: await latestState(),
        timeout: 0,
        signatures: await wallet.signMessage(
          computeStateHash(
            appInstance.identityHash,
            await latestState(),
            await latestNonce(),
            0
          )
        )
      });
  });

  describe("updating app state", async () => {
    describe("with owner", async () => {
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
});
