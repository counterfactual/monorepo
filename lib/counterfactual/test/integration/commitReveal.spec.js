"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_utils_1 = require("@counterfactual/test-utils");
const ethers = require("ethers");
const utils_1 = require("../../utils");
const { web3 } = global;
const { Registry, NonceRegistry, ConditionalTransfer, StaticCall } = utils_1.buildArtifacts;
function computeCommitHash(appSalt, chosenNumber) {
    return ethers.utils.solidityKeccak256(["bytes32", "uint256"], [appSalt, chosenNumber]);
}
var Stage;
(function (Stage) {
    Stage[Stage["SETTING_MAX"] = 0] = "SETTING_MAX";
    Stage[Stage["CHOOSING"] = 1] = "CHOOSING";
    Stage[Stage["GUESSING"] = 2] = "GUESSING";
    Stage[Stage["REVEALING"] = 3] = "REVEALING";
    Stage[Stage["DONE"] = 4] = "DONE";
})(Stage || (Stage = {}));
var Player;
(function (Player) {
    Player[Player["CHOOSING"] = 0] = "CHOOSING";
    Player[Player["GUESSING"] = 1] = "GUESSING";
})(Player || (Player = {}));
const { parseEther } = ethers.utils;
const CommitRevealApp = utils_1.AbstractContract.loadBuildArtifact("CommitRevealApp", {
    StaticCall
});
const { provider, unlockedAccount: masterAccount } = test_utils_1.setupTestEnv(web3);
const appStateEncoding = utils_1.abiEncodingForStruct(`
  address[2] playerAddrs;
  uint256 stage;
  uint256 maximum;
  uint256 guessedNumber;
  bytes32 commitHash;
  uint256 winner;
`);
async function createMultisig(funder, initialFunding, owners) {
    const multisig = new utils_1.Multisig(owners.map(w => w.address));
    await multisig.deploy(funder);
    await funder.sendTransaction({
        to: multisig.address,
        value: initialFunding
    });
    return multisig;
}
async function deployApp() {
    return CommitRevealApp.deploy(masterAccount);
}
async function deployStateChannel(multisig, appContract, terms) {
    const registry = Registry.getDeployed(masterAccount);
    const signers = multisig.owners;
    const stateChannel = new utils_1.StateChannel(signers, multisig, appContract, appStateEncoding, terms);
    await stateChannel.deploy(masterAccount, registry);
    if (!stateChannel.contract) {
        throw new Error("Deploy failed");
    }
    return stateChannel;
}
async function setFinalizedChannelNonce(multisig, channelNonce, channelNonceSalt, signers) {
    const nonceRegistry = NonceRegistry.getDeployed(masterAccount);
    await multisig.execCall(nonceRegistry, "setNonce", [channelNonceSalt, channelNonce], signers);
    await test_utils_1.mineBlocks(10);
    const channelNonceKey = utils_1.computeNonceRegistryKey(multisig.address, channelNonceSalt);
    (await nonceRegistry.functions.isFinalized(channelNonceKey, channelNonce)).should.be.equal(true);
    return channelNonceKey;
}
async function executeStateChannelTransfer(stateChannel, multisig, channelNonceKey, channelNonce, signers) {
    if (!stateChannel.contract) {
        throw new Error("Deploy failed");
    }
    const conditionalTransfer = ConditionalTransfer.getDeployed(masterAccount);
    const registry = Registry.getDeployed(masterAccount);
    const nonceRegistry = NonceRegistry.getDeployed(masterAccount);
    await multisig.execDelegatecall(conditionalTransfer, "executeStateChannelConditionalTransfer", [
        registry.address,
        nonceRegistry.address,
        channelNonceKey,
        channelNonce,
        stateChannel.contract.cfAddress,
        stateChannel.terms
    ], signers);
}
describe("CommitReveal", async () => {
    it("should pay out to the winner", async function () {
        this.timeout(4000);
        const [alice, bob] = test_utils_1.generateEthWallets(2, provider);
        const multisig = await createMultisig(masterAccount, parseEther("2"), [
            alice,
            bob
        ]);
        const appContract = await deployApp();
        const terms = {
            assetType: utils_1.AssetType.ETH,
            limit: parseEther("2")
        };
        const stateChannel = await deployStateChannel(multisig, appContract, terms);
        const numberSalt = "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc94";
        const chosenNumber = 5;
        const commitHash = computeCommitHash(numberSalt, chosenNumber);
        const appState = {
            playerAddrs: [alice.address, bob.address],
            stage: Stage.DONE,
            maximum: 10,
            guessedNumber: 1,
            winner: Player.CHOOSING,
            commitHash
        };
        await stateChannel.setState(appState, [alice, bob]);
        await stateChannel.setResolution(appState);
        const channelNonce = 1;
        const channelNonceSalt = "0x3004efe76b684aef3c1b29448e84d461ff211ddba19cdf75eb5e31eebbb6999b";
        const channelNonceKey = await setFinalizedChannelNonce(multisig, channelNonce, channelNonceSalt, [alice, bob]);
        await executeStateChannelTransfer(stateChannel, multisig, channelNonceKey, channelNonce, [alice, bob]);
        (await alice.getBalance()).should.be.bignumber.eq(parseEther("2"));
        (await bob.getBalance()).should.be.bignumber.eq(0);
    });
});
//# sourceMappingURL=commitReveal.spec.js.map