import * as ethers from "ethers";

import { AbstractContract, expect } from "../../utils";
import * as Utils from "../../utils/misc";

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

// HELPER DATA
enum Status {
  ON,
  DISPUTE,
  OFF
}
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

const TEST_ID = 0x4cbac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd;

contract("StateChannel", (accounts: string[]) => {
  let judge: ethers.Contract;

  let sendUpdateToChainWithNonce: (
    nonce: number,
    appState?: string
  ) => Promise<void>;

  let sendSignedUpdateToChainWithNonce: (
    nonce: number,
    appState?: string
  ) => Promise<void>;

  let sendSignedFinalizationToChain: () => Promise<any>;

  const latestState = async () => {
    const c = await judge.functions.channels(TEST_ID);
    return c.state.appStateHash;
  };
  const latestNonce = async () => judge.functions.latestNonce(TEST_ID);

  beforeAll(async () => {
    sendUpdateToChainWithNonce = (nonce: number, appState?: string) =>
      judge.functions.setState(
        TEST_ID,
        appState || ethers.constants.HashZero,
        nonce,
        TIMEOUT,
        "0x"
      );

    sendSignedUpdateToChainWithNonce = (nonce: number, appState?: string) =>
      judge.functions.setState(
        TEST_ID,
        appState || ethers.constants.HashZero,
        nonce,
        TIMEOUT,
        Utils.signMessage(
          computeHash(appState || ethers.constants.HashZero, nonce, TIMEOUT),
          unlockedAccount
        )
      );

    sendSignedFinalizationToChain = async () =>
      judge.functions.setState(
        TEST_ID,
        await latestState(),
        await latestNonce(),
        0,
        Utils.signMessage(
          computeHash(await latestState(), await latestNonce(), 0),
          unlockedAccount
        )
      );

    const stateChannelAdjudicator = await AbstractContract.loadBuildArtifact(
      "StateChannelAdjudicator"
    );

    judge = await stateChannelAdjudicator.deploy(unlockedAccount);
    await judge.functions.registerChannel(
      accounts[0],
      [A.address, B.address],
      ethers.constants.HashZero,
      ethers.constants.HashZero,
      10
    );
  });

  it("constructor sets initial state", async () => {
    const owner = await judge.functions.getOwner(TEST_ID);
    const signingKeys = await judge.functions.getSigningKeys();
    owner.should.be.equalIgnoreCase(accounts[0]);
    signingKeys[0].should.be.equalIgnoreCase(A.address);
    signingKeys[1].should.be.equalIgnoreCase(B.address);
  });

  it("should start without a dispute if deployed", async () => {
    const state = (await judge.functions.channels(TEST_ID)).state;
    state.status.should.be.equal(Status.ON);
  });

  describe("updating app state", async () => {
    describe("with owner", async () => {
      it("should work with higher nonce", async () => {
        (await latestNonce()).should.be.bignumber.eq(0);
        await sendUpdateToChainWithNonce(1);
        (await latestNonce()).should.be.bignumber.eq(1);
      });

      it("should work many times", async () => {
        (await latestNonce()).should.be.bignumber.eq(0);
        await sendUpdateToChainWithNonce(1);
        (await latestNonce()).should.be.bignumber.eq(1);
        await sendUpdateToChainWithNonce(2);
        (await latestNonce()).should.be.bignumber.eq(2);
        await sendUpdateToChainWithNonce(3);
        (await latestNonce()).should.be.bignumber.eq(3);
      });

      it("should work with much higher nonce", async () => {
        (await latestNonce()).should.be.bignumber.eq(0);
        await sendUpdateToChainWithNonce(1000);
        (await latestNonce()).should.be.bignumber.eq(1000);
      });

      it("shouldn't work with an equal nonce", async () => {
        await Utils.assertRejects(sendUpdateToChainWithNonce(0));
        (await latestNonce()).should.be.bignumber.eq(0);
      });

      it("shouldn't work with an lower nonce", async () => {
        await sendUpdateToChainWithNonce(1);
        await Utils.assertRejects(sendUpdateToChainWithNonce(0));
        (await latestNonce()).should.be.bignumber.eq(1);
      });
    });

    describe("with signing keys", async () => {
      it("should work with higher nonce", async () => {
        (await latestNonce()).should.be.bignumber.eq(0);
        await sendSignedUpdateToChainWithNonce(1);
        (await latestNonce()).should.be.bignumber.eq(1);
      });

      it("should work many times", async () => {
        (await latestNonce()).should.be.bignumber.eq(0);
        await sendSignedUpdateToChainWithNonce(1);
        (await latestNonce()).should.be.bignumber.eq(1);
        await sendSignedUpdateToChainWithNonce(2);
        (await latestNonce()).should.be.bignumber.eq(2);
        await sendSignedUpdateToChainWithNonce(3);
        (await latestNonce()).should.be.bignumber.eq(3);
      });

      it("should work with much higher nonce", async () => {
        (await latestNonce()).should.be.bignumber.eq(0);
        await sendSignedUpdateToChainWithNonce(1000);
        (await latestNonce()).should.be.bignumber.eq(1000);
      });

      it("shouldn't work with an equal nonce", async () => {
        await Utils.assertRejects(sendSignedUpdateToChainWithNonce(0));
        (await latestNonce()).should.be.bignumber.eq(0);
      });

      it("shouldn't work with an lower nonce", async () => {
        await sendSignedUpdateToChainWithNonce(1);
        await Utils.assertRejects(sendSignedUpdateToChainWithNonce(0));
        (await latestNonce()).should.be.bignumber.eq(1);
      });
    });
  });

  describe("finalizing app state", async () => {
    it("should work with owner", async () => {
      false.should.be.equal(await judge.functions.isClosed(TEST_ID));
      await judge.functions.setState(
        TEST_ID,
        await latestState(),
        await latestNonce(),
        0,
        ethers.constants.HashZero
      );
      true.should.be.equal(await judge.functions.isClosed(TEST_ID));
    });

    it("should work with keys", async () => {
      false.should.be.equal(await judge.functions.isClosed(TEST_ID));
      await sendSignedFinalizationToChain();
      true.should.be.equal(await judge.functions.isClosed(TEST_ID));
    });
  });

  describe("waiting for timeout", async () => {
    it("should block updates after the timeout", async () => {
      false.should.be.equal(await judge.functions.isClosed(TEST_ID));
      await sendUpdateToChainWithNonce(1);
      await Utils.mineBlocks(TIMEOUT);
      true.should.be.equal(await judge.functions.isClosed(TEST_ID));
      await Utils.assertRejects(sendUpdateToChainWithNonce(2));
      await Utils.assertRejects(sendSignedUpdateToChainWithNonce(0));
    });
  });
});
