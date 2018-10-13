import * as Utils from "@counterfactual/test-utils";
import * as ethers from "ethers";
import { AbstractContract, expect } from "../../utils";

const web3 = (global as any).web3;
const { unlockedAccount } = Utils.setupTestEnv(web3);

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

contract("AppInstance", (accounts: string[]) => {
  let AppInstance: AbstractContract;
  let stateChannel: ethers.Contract;
  let networkID;

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

  // @ts-ignore
  before(async () => {
    networkID = await AbstractContract.getNetworkID(unlockedAccount);
    const StaticCall = AbstractContract.loadBuildArtifact("StaticCall");
    const Signatures = AbstractContract.loadBuildArtifact("Signatures");
    AppInstance = await AbstractContract.loadBuildArtifact("AppInstance", {
      StaticCall,
      Signatures
    });

    sendUpdateToChainWithNonce = (nonce: number, appState?: string) =>
      stateChannel.functions.setState(
        appState || Utils.ZERO_BYTES32,
        nonce,
        TIMEOUT,
        "0x"
      );

    sendSignedUpdateToChainWithNonce = (nonce: number, appState?: string) =>
      stateChannel.functions.setState(
        appState || Utils.ZERO_BYTES32,
        nonce,
        TIMEOUT,
        Utils.signMessage(
          computeHash(appState || Utils.ZERO_BYTES32, nonce, TIMEOUT),
          unlockedAccount
        )
      );

    sendSignedFinalizationToChain = async () =>
      stateChannel.functions.setState(
        await latestState(),
        await latestNonce(),
        0,
        Utils.signMessage(
          computeHash(await latestState(), await latestNonce(), 0),
          unlockedAccount
        )
      );
  });

  beforeEach(async () => {
    const contractFactory = new ethers.ContractFactory(
      AppInstance.abi,
      await AppInstance.generateLinkedBytecode(networkID),
      unlockedAccount
    );
    stateChannel = await contractFactory.deploy(
      accounts[0],
      [A.address, B.address],
      Utils.ZERO_BYTES32,
      Utils.ZERO_BYTES32,
      10
    );
  });

  it("constructor sets initial state", async () => {
    const owner = await stateChannel.functions.getOwner();
    const signingKeys = await stateChannel.functions.getSigningKeys();
    expect(owner).to.equalIgnoreCase(accounts[0]);
    expect(signingKeys[0]).to.equalIgnoreCase(A.address);
    expect(signingKeys[1]).to.equalIgnoreCase(B.address);
  });

  it("should start without a dispute if deployed", async () => {
    const state = await stateChannel.functions.state();
    expect(state.status).to.eql(Status.ON);
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
        await sendUpdateToChainWithNonce(2);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(2));
        await sendUpdateToChainWithNonce(3);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(3));
      });

      it("should work with much higher nonce", async () => {
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(0));
        await sendUpdateToChainWithNonce(1000);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(1000));
      });

      it("shouldn't work with an equal nonce", async () => {
        await Utils.assertRejects(sendUpdateToChainWithNonce(0));
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(0));
      });

      it("shouldn't work with an lower nonce", async () => {
        await sendUpdateToChainWithNonce(1);
        await Utils.assertRejects(sendUpdateToChainWithNonce(0));
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(1));
      });
    });

    describe("with signing keys", async () => {
      it("should work with higher nonce", async () => {
        expect(await latestNonce()).be.eql(new ethers.utils.BigNumber(0));
        await sendSignedUpdateToChainWithNonce(1);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(1));
      });

      it("should work many times", async () => {
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(0));
        await sendSignedUpdateToChainWithNonce(1);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(1));
        await sendSignedUpdateToChainWithNonce(2);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(2));
        await sendSignedUpdateToChainWithNonce(3);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(3));
      });

      it("should work with much higher nonce", async () => {
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(0));
        await sendSignedUpdateToChainWithNonce(1000);
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(1000));
      });

      it("shouldn't work with an equal nonce", async () => {
        await Utils.assertRejects(sendSignedUpdateToChainWithNonce(0));
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(0));
      });

      it("shouldn't work with an lower nonce", async () => {
        await sendSignedUpdateToChainWithNonce(1);
        await Utils.assertRejects(sendSignedUpdateToChainWithNonce(0));
        expect(await latestNonce()).to.be.eql(new ethers.utils.BigNumber(1));
      });
    });
  });

  describe("finalizing app state", async () => {
    it("should work with owner", async () => {
      expect(await stateChannel.functions.isClosed()).to.eql(false);
      await stateChannel.functions.setState(
        await latestState(),
        await latestNonce(),
        0,
        Utils.ZERO_BYTES32
      );
      expect(await stateChannel.functions.isClosed()).to.eql(true);
    });

    it("should work with keys", async () => {
      expect(await stateChannel.functions.isClosed()).to.eql(false);
      await sendSignedFinalizationToChain();
      expect(await stateChannel.functions.isClosed()).to.eql(true);
    });
  });

  describe("waiting for timeout", async () => {
    it("should block updates after the timeout", async () => {
      expect(await stateChannel.functions.isClosed()).to.eql(false);
      await sendUpdateToChainWithNonce(1);
      await Utils.mineBlocks(TIMEOUT);
      expect(await stateChannel.functions.isClosed()).to.eql(true);
      await Utils.assertRejects(sendUpdateToChainWithNonce(2));
      await Utils.assertRejects(sendSignedUpdateToChainWithNonce(0));
    });
  });
});
