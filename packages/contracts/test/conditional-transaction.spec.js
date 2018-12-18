"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const constants_1 = require("ethers/constants");
const providers_1 = require("ethers/providers");
const utils_1 = require("ethers/utils");
const utils_2 = require("./utils");
const provider = new providers_1.Web3Provider(global.web3.currentProvider);
contract("ConditionalTransaction", (accounts) => {
    let unlockedAccount;
    let exampleCondition;
    let delegateProxy;
    let conditionalTransaction;
    before(async () => {
        unlockedAccount = await provider.getSigner(accounts[0]);
        exampleCondition = await new ethers_1.ContractFactory(artifacts.require("ExampleCondition").abi, artifacts.require("ExampleCondition").bytecode, unlockedAccount).deploy({ gasLimit: 6e9 });
        delegateProxy = await new ethers_1.ContractFactory(artifacts.require("DelegateProxy").abi, artifacts.require("DelegateProxy").bytecode, unlockedAccount).deploy({ gasLimit: 6e9 });
        const artifact = artifacts.require("ConditionalTransaction");
        artifact.link(artifacts.require("Transfer"));
        artifact.link(artifacts.require("LibStaticCall"));
        conditionalTransaction = await new ethers_1.ContractFactory(artifact.abi, artifact.binary, unlockedAccount).deploy({ gasLimit: 6e9 });
        await exampleCondition.deployed();
        await delegateProxy.deployed();
        await conditionalTransaction.deployed();
    });
    describe("Pre-commit to transfer details", () => {
        const makeCondition = (expectedValue, onlyCheckForSuccess) => ({
            onlyCheckForSuccess,
            expectedValueHash: utils_1.solidityKeccak256(["bytes"], [expectedValue]),
            parameters: constants_1.HashZero,
            selector: exampleCondition.interface.functions.isSatisfiedNoParam.sighash,
            to: exampleCondition.address
        });
        const makeConditionParam = (expectedValue, parameters) => ({
            parameters,
            expectedValueHash: utils_1.solidityKeccak256(["bytes"], [expectedValue]),
            onlyCheckForSuccess: false,
            selector: exampleCondition.interface.functions.isSatisfiedParam.sighash,
            to: exampleCondition.address
        });
        const trueParam = utils_1.defaultAbiCoder.encode(["tuple(bool)"], [[true]]);
        const falseParam = utils_1.defaultAbiCoder.encode(["tuple(bool)"], [[false]]);
        beforeEach(async () => {
            await unlockedAccount.sendTransaction({
                to: delegateProxy.address,
                value: constants_1.WeiPerEther
            });
        });
        it("transfers the funds conditionally if true", async () => {
            const randomTarget = utils_1.hexlify(utils_1.randomBytes(20));
            const tx = conditionalTransaction.interface.functions.executeSimpleConditionalTransaction.encode([
                makeCondition(constants_1.HashZero, true),
                {
                    value: [constants_1.WeiPerEther],
                    assetType: 0,
                    to: [randomTarget],
                    token: constants_1.AddressZero,
                    data: []
                }
            ]);
            await delegateProxy.functions.delegate(conditionalTransaction.address, tx, {
                gasLimit: 600000
            });
            const balTarget = await provider.getBalance(randomTarget);
            utils_2.expect(balTarget).to.eq(constants_1.WeiPerEther);
            const emptyBalance = constants_1.Zero;
            const balDelegate = await provider.getBalance(delegateProxy.address);
            utils_2.expect(balDelegate).to.eq(emptyBalance);
        });
        it("does not transfer the funds conditionally if false", async () => {
            const randomTarget = utils_1.hexlify(utils_1.randomBytes(20));
            const tx = conditionalTransaction.interface.functions.executeSimpleConditionalTransaction.encode([
                makeConditionParam(trueParam, falseParam),
                {
                    value: [constants_1.WeiPerEther],
                    assetType: 0,
                    to: [randomTarget],
                    token: constants_1.AddressZero,
                    data: []
                }
            ]);
            await utils_2.expect(delegateProxy.functions.delegate(conditionalTransaction.address, tx, {
                gasLimit: 60000
            })).to.be.reverted;
            const emptyBalance = constants_1.Zero;
            const balTarget = await provider.getBalance(randomTarget);
            utils_2.expect(balTarget).to.eq(emptyBalance);
            const balDelegate = await provider.getBalance(delegateProxy.address);
            utils_2.expect(balDelegate).to.eq(constants_1.WeiPerEther);
        });
    });
});
//# sourceMappingURL=conditional-transaction.spec.js.map