"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const constants_1 = require("ethers/constants");
const providers_1 = require("ethers/providers");
const utils_1 = require("ethers/utils");
const utils_2 = require("./utils");
const provider = new providers_1.Web3Provider(global.web3.currentProvider);
const APPROXIMATE_ERC20_TRANSFER_GAS = 75000;
const APPROXIMATE_ERC20_TRANSFER_10_GAS = 425000;
contract("Transfer", (accounts) => {
    let unlockedAccount;
    let exampleTransfer;
    let delegateProxy;
    let dolphinCoin;
    let AssetType;
    (function (AssetType) {
        AssetType[AssetType["ETH"] = 0] = "ETH";
        AssetType[AssetType["ERC20"] = 1] = "ERC20";
        AssetType[AssetType["ANY"] = 2] = "ANY";
    })(AssetType || (AssetType = {}));
    before(async () => {
        unlockedAccount = await provider.getSigner(accounts[0]);
        const artifact = await artifacts.require("ExampleTransfer");
        artifact.link(artifacts.require("Transfer"));
        exampleTransfer = await new ethers_1.ContractFactory(artifact.abi, artifact.binary, unlockedAccount).deploy({ gasLimit: 6e9 });
        delegateProxy = await new ethers_1.ContractFactory(artifacts.require("DelegateProxy").abi, artifacts.require("DelegateProxy").bytecode, unlockedAccount).deploy({ gasLimit: 6e9 });
        dolphinCoin = await new ethers_1.ContractFactory(artifacts.require("DolphinCoin").abi, artifacts.require("DolphinCoin").bytecode, unlockedAccount).deploy({ gasLimit: 6e9 });
        await exampleTransfer.deployed();
        await delegateProxy.deployed();
        await dolphinCoin.deployed();
    });
    describe("Executes delegated transfers for ETH", () => {
        beforeEach(async () => {
            await unlockedAccount.sendTransaction({
                to: delegateProxy.address,
                value: constants_1.WeiPerEther
            });
        });
        it("for 1 address", async () => {
            const randomTarget = utils_1.hexlify(utils_1.randomBytes(20));
            const details = {
                value: [constants_1.WeiPerEther],
                assetType: AssetType.ETH,
                to: [randomTarget],
                token: constants_1.AddressZero,
                data: []
            };
            await delegateProxy.functions.delegate(exampleTransfer.address, exampleTransfer.interface.functions.transfer.encode([details]), { gasLimit: APPROXIMATE_ERC20_TRANSFER_GAS });
            const balTarget = await provider.getBalance(randomTarget);
            utils_2.expect(balTarget).to.eq(constants_1.WeiPerEther);
        });
        it("for many addresses", async () => {
            const randomTargets = Array.from({ length: 10 }, () => utils_1.hexlify(utils_1.randomBytes(20)));
            const details = {
                value: Array(10).fill(constants_1.WeiPerEther.div(10)),
                assetType: AssetType.ETH,
                to: randomTargets,
                token: constants_1.AddressZero,
                data: []
            };
            await delegateProxy.functions.delegate(exampleTransfer.address, exampleTransfer.interface.functions.transfer.encode([details]), { gasLimit: APPROXIMATE_ERC20_TRANSFER_10_GAS });
            for (const target of randomTargets) {
                const bal = await provider.getBalance(target);
                utils_2.expect(bal).to.eq(constants_1.WeiPerEther.div(10));
            }
        });
    });
    describe("Executes delegated transfers for ERC20", () => {
        beforeEach(async () => {
            await dolphinCoin.functions.transfer(delegateProxy.address, 10);
        });
        it("for 1 address", async () => {
            const randomTarget = utils_1.hexlify(utils_1.randomBytes(20));
            const details = {
                value: [10],
                assetType: AssetType.ERC20,
                to: [randomTarget],
                token: dolphinCoin.address,
                data: []
            };
            await delegateProxy.functions.delegate(exampleTransfer.address, exampleTransfer.interface.functions.transfer.encode([details]), { gasLimit: APPROXIMATE_ERC20_TRANSFER_GAS });
            const balTarget = await dolphinCoin.functions.balanceOf(randomTarget);
            utils_2.expect(balTarget).to.eq(10);
        });
        it("for many addresses", async () => {
            const randomTargets = Array.from({ length: 10 }, () => utils_1.hexlify(utils_1.randomBytes(20)));
            const details = {
                value: Array(10).fill(1),
                assetType: AssetType.ERC20,
                to: randomTargets,
                token: dolphinCoin.address,
                data: []
            };
            await delegateProxy.functions.delegate(exampleTransfer.address, exampleTransfer.interface.functions.transfer.encode([details]), { gasLimit: APPROXIMATE_ERC20_TRANSFER_10_GAS });
            for (const target of randomTargets) {
                const bal = await dolphinCoin.functions.balanceOf(target);
                utils_2.expect(bal).to.eq(1);
            }
        });
    });
});
//# sourceMappingURL=transfer.spec.js.map