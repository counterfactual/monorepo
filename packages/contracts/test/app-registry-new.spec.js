"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ethers_1 = require("ethers");
const constants_1 = require("ethers/constants");
const providers_1 = require("ethers/providers");
const utils_1 = require("ethers/utils");
const constants_2 = require("./constants");
const utils_2 = require("./utils");
const provider = new providers_1.Web3Provider(global.web3.currentProvider);
contract("AppRegistry - Counterparty is Unresponsive", (accounts) => {
    let unlockedAccount;
    let appRegistry;
    before(async () => {
        unlockedAccount = await provider.getSigner(accounts[0]);
        const artifact = artifacts.require("AppRegistry");
        artifact.link(artifacts.require("LibStaticCall"));
        artifact.link(artifacts.require("Transfer"));
        appRegistry = await await new ethers_1.ContractFactory(artifact.abi, artifact.binary, unlockedAccount).deploy({ gasLimit: 6e9 });
        await appRegistry.deployed();
    });
    it("is possible to call setState to put state on-chain", async () => {
        const appInterface = new utils_2.AppInterface(constants_1.AddressZero, utils_1.hexlify(utils_1.randomBytes(4)), utils_1.hexlify(utils_1.randomBytes(4)), utils_1.hexlify(utils_1.randomBytes(4)), utils_1.hexlify(utils_1.randomBytes(4)));
        const terms = new utils_2.Terms(utils_2.AssetType.ETH, 0, constants_1.AddressZero);
        const appInstance = new utils_2.AppInstance(accounts[0], [constants_2.ALICE.address, constants_2.BOB.address], appInterface, terms, 10);
        await appRegistry.functions.setState(appInstance.appIdentity, {
            stateHash: utils_1.hexlify(utils_1.randomBytes(32)),
            nonce: 1,
            timeout: 10,
            signatures: constants_1.HashZero
        });
        const { status, latestSubmitter, appStateHash, disputeCounter, disputeNonce, finalizesAt, nonce } = await appRegistry.functions.appStates(appInstance.id);
        console.log({
            status,
            latestSubmitter,
            appStateHash,
            disputeCounter,
            disputeNonce,
            finalizesAt,
            nonce
        });
        chai_1.expect(status).to.be.eq(1);
    });
});
//# sourceMappingURL=app-registry-new.spec.js.map