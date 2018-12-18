"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const constants_1 = require("ethers/constants");
const providers_1 = require("ethers/providers");
const utils_1 = require("ethers/utils");
const utils_2 = require("./utils");
const provider = new providers_1.Web3Provider(global.web3.currentProvider);
contract("LibCondition", (accounts) => {
    let unlockedAccount;
    let exampleCondition;
    let libCondition;
    before(async () => {
        unlockedAccount = await provider.getSigner(accounts[0]);
        const libConditionArtifact = artifacts.require("LibCondition");
        const exampleConditionArtifact = artifacts.require("ExampleCondition");
        libConditionArtifact.link(artifacts.require("LibStaticCall"));
        exampleCondition = await new ethers_1.ContractFactory(exampleConditionArtifact.abi, exampleConditionArtifact.bytecode, unlockedAccount).deploy({ gasLimit: 6e9 });
        libCondition = await new ethers_1.ContractFactory(libConditionArtifact.abi, libConditionArtifact.binary, unlockedAccount).deploy({ gasLimit: 6e9 });
        await exampleCondition.deployed();
        await libCondition.deployed();
    });
    describe("asserts conditions with no params", () => {
        const makeCondition = (expectedValue, onlyCheckForSuccess) => ({
            onlyCheckForSuccess,
            expectedValueHash: utils_1.keccak256(expectedValue),
            parameters: constants_1.HashZero,
            selector: exampleCondition.interface.functions.isSatisfiedNoParam.sighash,
            to: exampleCondition.address
        });
        it("returns true if function did not fail", async () => {
            const condition = makeCondition(constants_1.HashZero, true);
            utils_2.expect(await libCondition.functions.isSatisfied(condition)).to.be.true;
        });
        it("returns true if function returns expected result", async () => {
            const condition = makeCondition(utils_1.defaultAbiCoder.encode(["bool"], [true]), false);
            utils_2.expect(await libCondition.functions.isSatisfied(condition)).to.be.true;
        });
        it("returns false if function returns unexpected result", async () => {
            const condition = makeCondition(constants_1.HashZero, false);
            utils_2.expect(await libCondition.functions.isSatisfied(condition)).to.be.false;
        });
    });
    describe("asserts conditions with params", () => {
        const makeCondition = (expectedValue, parameters, onlyCheckForSuccess) => ({
            onlyCheckForSuccess,
            parameters,
            expectedValueHash: utils_1.solidityKeccak256(["bytes"], [expectedValue]),
            selector: exampleCondition.interface.functions.isSatisfiedParam.sighash,
            to: exampleCondition.address
        });
        const trueParam = utils_1.defaultAbiCoder.encode(["tuple(bool)"], [[true]]);
        const falseParam = utils_1.defaultAbiCoder.encode(["tuple(bool)"], [[false]]);
        it("returns true if function did not fail", async () => {
            const condition = makeCondition(constants_1.HashZero, trueParam, true);
            utils_2.expect(await libCondition.functions.isSatisfied(condition)).to.be.true;
        });
        it("returns true if function did not fail but returned false", async () => {
            const condition = makeCondition(constants_1.HashZero, falseParam, true);
            utils_2.expect(await libCondition.functions.isSatisfied(condition)).to.be.true;
        });
        it("returns true if function returns expected result", async () => {
            const condition = makeCondition(utils_1.defaultAbiCoder.encode(["bool"], [true]), trueParam, false);
            utils_2.expect(await libCondition.functions.isSatisfied(condition)).to.be.true;
        });
        it("returns false if function returns unexpected result", async () => {
            const condition = makeCondition(utils_1.defaultAbiCoder.encode(["bool"], [true]), falseParam, false);
            utils_2.expect(await libCondition.functions.isSatisfied(condition)).to.be.false;
        });
    });
});
//# sourceMappingURL=libCondition.spec.js.map