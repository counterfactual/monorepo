import * as ethers from "ethers";

import { AppInstance, AppInterface, AssetType, Terms } from "../src";
import { expect } from "../utils";
import { assertRejects, mineBlocks } from "../utils/misc";

import { ALICE, BOB } from "./test-constants";

// HELPER DATA
const TIMEOUT = 30;
const [A, B] = [
  // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
  new ethers.Wallet(
    "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"
  ),
  // 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
  new ethers.Wallet(
    "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27"
  )
];

// HELPER FUNCTION
const computeHash = (stateHash: string, nonce: number, timeout: number) =>
  ethers.utils.solidityKeccak256(
    ["bytes1", "address[]", "uint256", "uint256", "bytes32"],
    ["0x19", [A.address, B.address], nonce, timeout, stateHash]
  );

const provider = new ethers.providers.Web3Provider(
  (global as any).web3.currentProvider
);

contract("AppRegistry", (accounts: string[]) => {
  let unlockedAccount: ethers.providers.JsonRpcSigner;

  // Setup AppInstance
  const appInstance = new AppInstance(
    accounts[0],
    [ALICE.address, BOB.address],
    new AppInterface(
      ethers.constants.AddressZero,
      ethers.utils.hexlify(ethers.utils.randomBytes(4)),
      ethers.utils.hexlify(ethers.utils.randomBytes(4)),
      ethers.utils.hexlify(ethers.utils.randomBytes(4)),
      ethers.utils.hexlify(ethers.utils.randomBytes(4))
    ),
    new Terms(AssetType.ETH, 0, ethers.constants.AddressZero),
    10
  );

  let appRegistry: ethers.Contract;

  let sendUpdateToChainWithNonce: (
    nonce: number,
    appState?: string
  ) => Promise<void>;

  let sendSignedUpdateToChainWithNonce: (
    nonce: number,
    appState?: string
  ) => Promise<void>;

  let cancelChallenge: () => Promise<void>;

  let sendSignedFinalizationToChain: () => Promise<any>;

  const latestState = async () =>
    (await appRegistry.functions.getAppChallenge(appInstance.id)).appStateHash;

  const latestNonce = async () =>
    (await appRegistry.functions.getAppChallenge(appInstance.id)).nonce;

  const isStateFinalized = async () =>
    await appRegistry.functions.isStateFinalized(appInstance.id);

  // @ts-ignore
  before(async () => {
    unlockedAccount = await provider.getSigner(accounts[0]);
  });

  // @ts-ignore
  beforeEach(async () => {
    const appRegistryArtifact = artifacts.require("AppRegistry");

    appRegistry = new ethers.Contract(
      (await appRegistryArtifact.new()).address,
      appRegistryArtifact.abi,
      unlockedAccount
    );

    sendUpdateToChainWithNonce = (nonce: number, appState?: string) =>
      appRegistry.functions.setState(appInstance.appIdentity.toJson(), {
        nonce,
        stateHash: appState || ethers.constants.HashZero,
        timeout: TIMEOUT,
        signatures: ethers.constants.HashZero
      });

    cancelChallenge = () =>
      appRegistry.functions.cancelChallenge(
        appInstance.appIdentity.toJson(),
        ethers.constants.HashZero
      );

    sendSignedUpdateToChainWithNonce = async (
      nonce: number,
      appState?: string
    ) =>
      appRegistry.functions.setState(appInstance.appIdentity.toJson(), {
        nonce,
        stateHash: appState || ethers.constants.HashZero,
        timeout: TIMEOUT,
        signatures: await unlockedAccount.signMessage(
          computeHash(appState || ethers.constants.HashZero, nonce, TIMEOUT)
        )
      });

    sendSignedFinalizationToChain = async () =>
      appRegistry.functions.setState(appInstance.appIdentity.toJson(), {
        nonce: (await latestNonce()) + 1,
        stateHash: await latestState(),
        timeout: 0,
        signatures: await unlockedAccount.signMessage(
          computeHash(await latestState(), await latestNonce(), 0)
        )
      });
  });

  describe("updating app state", async () => {
    describe("with owner", async () => {
      it("should work with higher nonce", async () => {
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(0));
        await sendUpdateToChainWithNonce(1);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(1));
      });

      it("should work many times", async () => {
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(0));
        await sendUpdateToChainWithNonce(1);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(1));
        await cancelChallenge();
        await sendUpdateToChainWithNonce(2);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(2));
        await cancelChallenge();
        await sendUpdateToChainWithNonce(3);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(3));
      });

      it("should work with much higher nonce", async () => {
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(0));
        await sendUpdateToChainWithNonce(1000);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(1000));
      });

      it("shouldn't work with an equal nonce", async () => {
        await assertRejects(sendUpdateToChainWithNonce(0));
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(0));
      });

      it("shouldn't work with an lower nonce", async () => {
        await sendUpdateToChainWithNonce(1);
        await assertRejects(sendUpdateToChainWithNonce(0));
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(1));
      });
    });

    describe("with signing keys", async () => {
      it("should work with higher nonce", async () => {
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(0));
        await sendSignedUpdateToChainWithNonce(1);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(1));
      });

      it("should work many times", async () => {
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(0));
        await sendSignedUpdateToChainWithNonce(1);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(1));
        await cancelChallenge();
        await sendSignedUpdateToChainWithNonce(2);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(2));
        await cancelChallenge();
        await sendSignedUpdateToChainWithNonce(3);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(3));
      });

      it("should work with much higher nonce", async () => {
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(0));
        await sendSignedUpdateToChainWithNonce(1000);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(1000));
      });

      it("shouldn't work with an equal nonce", async () => {
        await assertRejects(sendSignedUpdateToChainWithNonce(0));
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(0));
      });

      it("shouldn't work with a lower nonce", async () => {
        await sendSignedUpdateToChainWithNonce(1);
        await assertRejects(sendSignedUpdateToChainWithNonce(0));
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(1));
      });
    });
  });

  describe("finalizing app state", async () => {
    it("should work with owner", async () => {
      expect(await isStateFinalized()).to.be.equal(false);
      await appRegistry.functions.setState(appInstance.appIdentity.toJson(), {
        nonce: (await latestNonce()) + 1,
        stateHash: await latestState(),
        timeout: 0,
        signatures: ethers.constants.HashZero
      });
      expect(await isStateFinalized()).to.be.equal(true);
    });

    it("should work with keys", async () => {
      expect(await isStateFinalized()).to.be.equal(false);
      await sendSignedFinalizationToChain();
      expect(await isStateFinalized()).to.be.equal(true);
    });
  });

  describe("waiting for timeout", async () => {
    it("should block updates after the timeout", async () => {
      expect(await isStateFinalized()).to.be.equal(false);
      await sendUpdateToChainWithNonce(1);
      await mineBlocks(TIMEOUT);
      expect(await isStateFinalized()).to.be.equal(true);
      await assertRejects(sendUpdateToChainWithNonce(2));
      await assertRejects(sendSignedUpdateToChainWithNonce(0));
    });
  });
});
