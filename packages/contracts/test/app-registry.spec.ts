import { ethers } from "ethers";

import {
  AppInstance,
  AppInterface,
  AssetType,
  computeStateHash,
  Terms
} from "../src";

import { ALICE, BOB } from "./constants";
import { expect } from "./utils";

// HELPER DATA
const TIMEOUT = 30;

contract("AppRegistry", (accounts: string[]) => {
  let provider: ethers.providers.Web3Provider;
  let wallet: ethers.providers.JsonRpcSigner;
  let appRegistry: ethers.Contract;

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
    provider = new ethers.providers.Web3Provider(
      (global as any).web3.currentProvider
    );

    wallet = await provider.getSigner(accounts[0]);

    appRegistry = new ethers.Contract(
      artifacts.require("AppRegistry").address,
      artifacts.require("AppRegistry").abi,
      wallet
    );
  });

  beforeEach(async () => {
    const appInstance = new AppInstance(
      accounts[0],
      [ALICE.address, BOB.address],
      new AppInterface(
        ethers.utils.hexlify(ethers.utils.randomBytes(20)),
        ethers.utils.hexlify(ethers.utils.randomBytes(4)),
        ethers.utils.hexlify(ethers.utils.randomBytes(4)),
        ethers.utils.hexlify(ethers.utils.randomBytes(4)),
        ethers.utils.hexlify(ethers.utils.randomBytes(4))
      ),
      new Terms(AssetType.ETH, 0, ethers.constants.AddressZero),
      10
    );

    latestState = async () =>
      (await appRegistry.functions.getAppChallenge(appInstance.id))
        .appStateHash;

    latestNonce = async () =>
      (await appRegistry.functions.getAppChallenge(appInstance.id)).nonce;

    isStateFinalized = async () =>
      await appRegistry.functions.isStateFinalized(appInstance.id);

    setStateAsOwner = (nonce: number, appState?: string) =>
      appRegistry.functions.setState(appInstance.appIdentity, {
        nonce,
        stateHash: appState || ethers.constants.HashZero,
        timeout: TIMEOUT,
        signatures: ethers.constants.HashZero
      });

    cancelChallenge = () =>
      appRegistry.functions.cancelChallenge(
        appInstance.appIdentity,
        ethers.constants.HashZero
      );

    setStateWithSignatures = async (nonce: number, appState?: string) =>
      appRegistry.functions.setState(appInstance.appIdentity, {
        nonce,
        stateHash: appState || ethers.constants.HashZero,
        timeout: TIMEOUT,
        signatures: await wallet.signMessage(
          computeStateHash(
            appInstance.id,
            appState || ethers.constants.HashZero,
            nonce,
            TIMEOUT
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
            appInstance.id,
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
        // @ts-ignore
        await expect(setStateAsOwner(0)).to.be.reverted;
        expect(await latestNonce()).to.eq(0);
      });

      it("shouldn't work with an lower nonce", async () => {
        await setStateAsOwner(1);
        // @ts-ignore
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
        // @ts-ignore
        await expect(setStateWithSignatures(0)).to.be.reverted;
        expect(await latestNonce()).to.eq(0);
      });

      it("shouldn't work with a lower nonce", async () => {
        await setStateWithSignatures(1);
        // @ts-ignore
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

      for (const _ of Array(TIMEOUT + 1)) {
        await provider.send("evm_mine", []);
      }

      expect(await isStateFinalized()).to.be.true;

      // @ts-ignore
      await expect(setStateAsOwner(2)).to.be.reverted;

      // @ts-ignore
      await expect(setStateWithSignatures(0)).to.be.reverted;
    });
  });
});
