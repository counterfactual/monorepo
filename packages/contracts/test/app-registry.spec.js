"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const TIMEOUT = 30;
contract("AppRegistry", (accounts) => {
    let provider;
    let wallet;
    let appRegistry;
    let setStateAsOwner;
    let setStateWithSignatures;
    let cancelChallenge;
    let sendSignedFinalizationToChain;
    let latestState;
    let latestNonce;
    let isStateFinalized;
    before(async () => {
        provider = new ethers_1.ethers.providers.Web3Provider(global.web3.currentProvider);
        wallet = await provider.getSigner(accounts[0]);
        const artifact = artifacts.require("AppRegistry");
        artifact.link(artifacts.require("LibStaticCall"));
        artifact.link(artifacts.require("Transfer"));
        appRegistry = await new ethers_1.ethers.ContractFactory(artifact.abi, artifact.binary, wallet).deploy({ gasLimit: 6e9 });
        await appRegistry.deployed();
    });
    beforeEach(async () => {
        const appInstance = new utils_1.AppInstance(accounts[0], [constants_1.ALICE.address, constants_1.BOB.address], new utils_1.AppInterface(ethers_1.ethers.utils.hexlify(ethers_1.ethers.utils.randomBytes(20)), ethers_1.ethers.utils.hexlify(ethers_1.ethers.utils.randomBytes(4)), ethers_1.ethers.utils.hexlify(ethers_1.ethers.utils.randomBytes(4)), ethers_1.ethers.utils.hexlify(ethers_1.ethers.utils.randomBytes(4)), ethers_1.ethers.utils.hexlify(ethers_1.ethers.utils.randomBytes(4))), new utils_1.Terms(utils_1.AssetType.ETH, 0, ethers_1.ethers.constants.AddressZero), 10);
        latestState = async () => (await appRegistry.functions.getAppChallenge(appInstance.id))
            .appStateHash;
        latestNonce = async () => (await appRegistry.functions.getAppChallenge(appInstance.id)).nonce;
        isStateFinalized = async () => await appRegistry.functions.isStateFinalized(appInstance.id);
        setStateAsOwner = (nonce, appState) => appRegistry.functions.setState(appInstance.appIdentity, {
            nonce,
            stateHash: appState || ethers_1.ethers.constants.HashZero,
            timeout: TIMEOUT,
            signatures: ethers_1.ethers.constants.HashZero
        });
        cancelChallenge = () => appRegistry.functions.cancelChallenge(appInstance.appIdentity, ethers_1.ethers.constants.HashZero);
        setStateWithSignatures = async (nonce, appState) => appRegistry.functions.setState(appInstance.appIdentity, {
            nonce,
            stateHash: appState || ethers_1.ethers.constants.HashZero,
            timeout: TIMEOUT,
            signatures: await wallet.signMessage(utils_1.computeStateHash(appInstance.id, appState || ethers_1.ethers.constants.HashZero, nonce, TIMEOUT))
        });
        sendSignedFinalizationToChain = async () => appRegistry.functions.setState(appInstance.appIdentity, {
            nonce: (await latestNonce()) + 1,
            stateHash: await latestState(),
            timeout: 0,
            signatures: await wallet.signMessage(utils_1.computeStateHash(appInstance.id, await latestState(), await latestNonce(), 0))
        });
    });
    describe("updating app state", async () => {
        describe("with owner", async () => {
            it("should work with higher nonce", async () => {
                utils_1.expect(await latestNonce()).to.eq(0);
                await setStateAsOwner(1);
                utils_1.expect(await latestNonce()).to.eq(1);
            });
            it("should work many times", async () => {
                utils_1.expect(await latestNonce()).to.eq(0);
                await setStateAsOwner(1);
                utils_1.expect(await latestNonce()).to.eq(1);
                await cancelChallenge();
                await setStateAsOwner(2);
                utils_1.expect(await latestNonce()).to.eq(2);
                await cancelChallenge();
                await setStateAsOwner(3);
                utils_1.expect(await latestNonce()).to.eq(3);
            });
            it("should work with much higher nonce", async () => {
                utils_1.expect(await latestNonce()).to.eq(0);
                await setStateAsOwner(1000);
                utils_1.expect(await latestNonce()).to.eq(1000);
            });
            it("shouldn't work with an equal nonce", async () => {
                await utils_1.expect(setStateAsOwner(0)).to.be.reverted;
                utils_1.expect(await latestNonce()).to.eq(0);
            });
            it("shouldn't work with an lower nonce", async () => {
                await setStateAsOwner(1);
                await utils_1.expect(setStateAsOwner(0)).to.be.reverted;
                utils_1.expect(await latestNonce()).to.eq(1);
            });
        });
        describe("with signing keys", async () => {
            it("should work with higher nonce", async () => {
                utils_1.expect(await latestNonce()).to.eq(0);
                await setStateWithSignatures(1);
                utils_1.expect(await latestNonce()).to.eq(1);
            });
            it("should work many times", async () => {
                utils_1.expect(await latestNonce()).to.eq(0);
                await setStateWithSignatures(1);
                utils_1.expect(await latestNonce()).to.eq(1);
                await cancelChallenge();
                await setStateWithSignatures(2);
                utils_1.expect(await latestNonce()).to.eq(2);
                await cancelChallenge();
                await setStateWithSignatures(3);
                utils_1.expect(await latestNonce()).to.eq(3);
            });
            it("should work with much higher nonce", async () => {
                utils_1.expect(await latestNonce()).to.eq(0);
                await setStateWithSignatures(1000);
                utils_1.expect(await latestNonce()).to.eq(1000);
            });
            it("shouldn't work with an equal nonce", async () => {
                await utils_1.expect(setStateWithSignatures(0)).to.be.reverted;
                utils_1.expect(await latestNonce()).to.eq(0);
            });
            it("shouldn't work with a lower nonce", async () => {
                await setStateWithSignatures(1);
                await utils_1.expect(setStateWithSignatures(0)).to.be.reverted;
                utils_1.expect(await latestNonce()).to.eq(1);
            });
        });
    });
    describe("finalizing app state", async () => {
        it("should work with keys", async () => {
            utils_1.expect(await isStateFinalized()).to.be.false;
            await sendSignedFinalizationToChain();
            utils_1.expect(await isStateFinalized()).to.be.true;
        });
    });
    describe("waiting for timeout", async () => {
        it("should block updates after the timeout", async () => {
            utils_1.expect(await isStateFinalized()).to.be.false;
            await setStateAsOwner(1);
            for (const _ of Array(TIMEOUT + 1)) {
                await provider.send("evm_mine", []);
            }
            utils_1.expect(await isStateFinalized()).to.be.true;
            await utils_1.expect(setStateAsOwner(2)).to.be.reverted;
            await utils_1.expect(setStateWithSignatures(0)).to.be.reverted;
        });
    });
});
//# sourceMappingURL=app-registry.spec.js.map