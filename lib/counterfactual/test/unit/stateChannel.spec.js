"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers = require("ethers");
const Utils = require("@counterfactual/test-utils");
const StaticCall = artifacts.require("StaticCall");
const StateChannel = artifacts.require("StateChannel");
const Signatures = artifacts.require("Signatures");
const web3 = global.web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);
var Status;
(function (Status) {
    Status[Status["ON"] = 0] = "ON";
    Status[Status["DISPUTE"] = 1] = "DISPUTE";
    Status[Status["OFF"] = 2] = "OFF";
})(Status || (Status = {}));
const TIMEOUT = 30;
const [A, B] = [
    new ethers.Wallet("0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"),
    new ethers.Wallet("0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27")
];
const computeHash = (stateHash, nonce, timeout) => ethers.utils.solidityKeccak256(["bytes1", "address[]", "uint256", "uint256", "bytes32"], ["0x19", [A.address, B.address], nonce, timeout, stateHash]);
StateChannel.link("Signatures", Signatures.address);
StateChannel.link("StaticCall", StaticCall.address);
contract("StateChannel", (accounts) => {
    let stateChannel;
    let sendUpdateToChainWithNonce;
    let sendSignedUpdateToChainWithNonce;
    let sendSignedFinalizationToChain;
    const latestState = async () => {
        return (await stateChannel.functions.state()).appStateHash;
    };
    const latestNonce = async () => stateChannel.functions.latestNonce();
    before(async () => {
        sendUpdateToChainWithNonce = (nonce, appState) => stateChannel.functions.setState(appState || Utils.ZERO_BYTES32, nonce, TIMEOUT, "0x");
        sendSignedUpdateToChainWithNonce = (nonce, appState) => stateChannel.functions.setState(appState || Utils.ZERO_BYTES32, nonce, TIMEOUT, Utils.signMessage(computeHash(appState || Utils.ZERO_BYTES32, nonce, TIMEOUT), unlockedAccount));
        sendSignedFinalizationToChain = async () => stateChannel.functions.setState(await latestState(), await latestNonce(), 0, Utils.signMessage(computeHash(await latestState(), await latestNonce(), 0), unlockedAccount));
    });
    beforeEach(async () => {
        const contract = new ethers.Contract("", StateChannel.abi, unlockedAccount);
        stateChannel = await contract.deploy(StateChannel.binary, accounts[0], [A.address, B.address], Utils.ZERO_BYTES32, Utils.ZERO_BYTES32, 10);
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
            false.should.be.equal(await stateChannel.functions.isClosed());
            await stateChannel.functions.setState(await latestState(), await latestNonce(), 0, Utils.ZERO_BYTES32);
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
//# sourceMappingURL=stateChannel.spec.js.map