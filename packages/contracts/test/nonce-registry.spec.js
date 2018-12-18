"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const constants_1 = require("ethers/constants");
const providers_1 = require("ethers/providers");
const utils_1 = require("ethers/utils");
const utils_2 = require("./utils");
const provider = new providers_1.Web3Provider(global.web3.currentProvider);
contract("NonceRegistry", accounts => {
    let unlockedAccount;
    let nonceRegistry;
    const computeKey = (timeout, salt) => utils_1.solidityKeccak256(["address", "uint256", "bytes32"], [accounts[0], timeout, salt]);
    before(async () => {
        unlockedAccount = await provider.getSigner(accounts[0]);
        const artifact = artifacts.require("NonceRegistry");
        nonceRegistry = await new ethers_1.ContractFactory(artifact.abi, artifact.bytecode, unlockedAccount).deploy({ gasLimit: 6e9 });
        await nonceRegistry.deployed();
    });
    it("can set nonces", async () => {
        const timeout = utils_1.bigNumberify(10);
        const salt = constants_1.HashZero;
        const value = constants_1.One;
        await nonceRegistry.functions.setNonce(timeout, salt, value);
        const ret = await nonceRegistry.functions.table(computeKey(timeout, salt));
        const blockNumber = utils_1.bigNumberify(await provider.getBlockNumber());
        utils_2.expect(ret.nonceValue).to.eq(constants_1.One);
        utils_2.expect(ret.finalizesAt).to.eq(blockNumber.add(timeout));
    });
    it("fails if nonce increment is not positive", async () => {
        const timeout = 10;
        const salt = constants_1.HashZero;
        const value = 0;
        const setNonce = nonceRegistry.functions.setNonce;
        await utils_2.expect(setNonce(timeout, salt, value)).to.be.reverted;
    });
    it("can insta-finalize nonces", async () => {
        const timeout = constants_1.Zero;
        const salt = constants_1.HashZero;
        const value = constants_1.One;
        const key = computeKey(timeout, salt);
        await nonceRegistry.functions.setNonce(timeout, salt, value);
        const ret = await nonceRegistry.functions.table(key);
        const isFinal = await nonceRegistry.functions.isFinalized(key, value);
        const blockNumber = utils_1.bigNumberify(await provider.getBlockNumber());
        utils_2.expect(ret.nonceValue).to.eq(value);
        utils_2.expect(ret.finalizesAt).to.eq(blockNumber);
        utils_2.expect(isFinal).to.be.true;
    });
});
//# sourceMappingURL=nonce-registry.spec.js.map