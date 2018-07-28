import * as ethers from "ethers";

import * as Utils from "@counterfactual/test-utils";

const StaticCall = artifacts.require("StaticCall");
const StateChannel = artifacts.require("StateChannel");
const Signatures = artifacts.require("Signatures");

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

// LINK
StateChannel.link("Signatures", Signatures.address);
StateChannel.link("StaticCall", StaticCall.address);

contract("StateChannel", (accounts: string[]) => {
  let stateChannel: ethers.Contract;

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
    return (await stateChannel.functions.state()).appStateHash;
  };
  const latestNonce = async () => stateChannel.functions.latestNonce();

  before(async () => {
    sendUpdateToChainWithNonce = (nonce: number, appState?: string) =>
      stateChannel.functions.setState(
        appState || Utils.zeroBytes32,
        nonce,
        TIMEOUT,
        "0x",
        Utils.highGasLimit
      );

    sendSignedUpdateToChainWithNonce = (nonce: number, appState?: string) =>
      stateChannel.functions.setState(
        appState || Utils.zeroBytes32,
        nonce,
        TIMEOUT,
        Utils.signMessageBytes(
          computeHash(appState || Utils.zeroBytes32, nonce, TIMEOUT),
          [unlockedAccount]
        ),
        Utils.highGasLimit
      );

    sendSignedFinalizationToChain = async () =>
      stateChannel.functions.setState(
        await latestState(),
        await latestNonce(),
        0,
        Utils.signMessageBytes(
          computeHash(await latestState(), await latestNonce(), 0),
          [unlockedAccount]
        ),
        Utils.highGasLimit
      );
  });

  beforeEach(async () => {
    const contract = new ethers.Contract("", StateChannel.abi, unlockedAccount);
    stateChannel = await contract.deploy(
      StateChannel.binary,
      accounts[0],
      [A.address, B.address],
      Utils.zeroBytes32,
      Utils.zeroBytes32,
      10
    );
  });

  it("constructor sets initial state", async () => {
    const owner = await stateChannel.functions.getOwner();
    const signingKeys = await stateChannel.functions.getSigningKeys();
    owner.should.be.equalIgnoreCase(accounts[0]);
    signingKeys[0].should.be.equalIgnoreCase(A.address);
    signingKeys[1].should.be.equalIgnoreCase(B.address);
  });

  it("should start without a dispute if deployed", async () => {
    const state = await stateChannel.functions.state();
    state.status.should.be.equal(Status.ON);
  });

  describe("updating app state", async () => {
    describe("with owner", async () => {
      it("should work with higher nonce", async () => {
        "0".should.be.bignumber.eq(await latestNonce());
        await sendUpdateToChainWithNonce(1);
        "1".should.be.bignumber.eq(await latestNonce());
      });

      it("should work many times", async () => {
        "0".should.be.bignumber.eq(await latestNonce());
        await sendUpdateToChainWithNonce(1);
        "1".should.be.bignumber.eq(await latestNonce());
        await sendUpdateToChainWithNonce(2);
        "2".should.be.bignumber.eq(await latestNonce());
        await sendUpdateToChainWithNonce(3);
        "3".should.be.bignumber.eq(await latestNonce());
      });

      it("should work with much higher nonce", async () => {
        "0".should.be.bignumber.eq(await latestNonce());
        await sendUpdateToChainWithNonce(1000);
        "1000".should.be.bignumber.eq(await latestNonce());
      });

      it("shouldn't work with an equal nonce", async () => {
        await Utils.assertRejects(sendUpdateToChainWithNonce(0));
        "0".should.be.bignumber.eq(await latestNonce());
      });

      it("shouldn't work with an lower nonce", async () => {
        await sendUpdateToChainWithNonce(1);
        await Utils.assertRejects(sendUpdateToChainWithNonce(0));
        "1".should.be.bignumber.eq(await latestNonce());
      });
    });

    describe("with signing keys", async () => {
      it("should work with higher nonce", async () => {
        "0".should.be.bignumber.eq(await latestNonce());
        await sendSignedUpdateToChainWithNonce(1);
        "1".should.be.bignumber.eq(await latestNonce());
      });

      it("should work many times", async () => {
        "0".should.be.bignumber.eq(await latestNonce());
        await sendSignedUpdateToChainWithNonce(1);
        "1".should.be.bignumber.eq(await latestNonce());
        await sendSignedUpdateToChainWithNonce(2);
        "2".should.be.bignumber.eq(await latestNonce());
        await sendSignedUpdateToChainWithNonce(3);
        "3".should.be.bignumber.eq(await latestNonce());
      });

      it("should work with much higher nonce", async () => {
        "0".should.be.bignumber.eq(await latestNonce());
        await sendSignedUpdateToChainWithNonce(1000);
        "1000".should.be.bignumber.eq(await latestNonce());
      });

      it("shouldn't work with an equal nonce", async () => {
        await Utils.assertRejects(sendSignedUpdateToChainWithNonce(0));
        "0".should.be.bignumber.eq(await latestNonce());
      });

      it("shouldn't work with an lower nonce", async () => {
        await sendSignedUpdateToChainWithNonce(1);
        await Utils.assertRejects(sendSignedUpdateToChainWithNonce(0));
        "1".should.be.bignumber.eq(await latestNonce());
      });
    });
  });

  describe("finalizing app state", async () => {
    it("should work with owner", async () => {
      false.should.be.equal(await stateChannel.functions.isClosed());
      await stateChannel.functions.setState(
        await latestState(),
        await latestNonce(),
        0,
        Utils.zeroBytes32,
        Utils.highGasLimit
      );
      true.should.be.equal(await stateChannel.functions.isClosed());
    });

    it("should work with keys", async () => {
      false.should.be.equal(await stateChannel.functions.isClosed());
      await sendSignedFinalizationToChain();
      true.should.be.equal(await stateChannel.functions.isClosed());
    });
  });

  describe("waiting for timeout", async () => {
    it("should block updates after the timeout", async () => {
      false.should.be.equal(await stateChannel.functions.isClosed());
      await sendUpdateToChainWithNonce(1);
      await Utils.mineBlocks(TIMEOUT);
      true.should.be.equal(await stateChannel.functions.isClosed());
      await Utils.assertRejects(sendUpdateToChainWithNonce(2));
      await Utils.assertRejects(sendSignedUpdateToChainWithNonce(0));
    });
  });
});
