"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const providers_1 = require("ethers/providers");
const utils_1 = require("ethers/utils");
const utils_2 = require("./utils");
const provider = new providers_1.Web3Provider(global.web3.currentProvider);
contract("StaticCall", (accounts) => {
    let unlockedAccount;
    let testCaller;
    let echo;
    before(async () => {
        unlockedAccount = await provider.getSigner(accounts[0]);
        const testCallerArtifact = artifacts.require("TestCaller");
        testCallerArtifact.link(artifacts.require("LibStaticCall"));
        testCaller = await new ethers_1.ContractFactory(testCallerArtifact.abi, testCallerArtifact.binary, unlockedAccount).deploy({ gasLimit: 6e9 });
        const echoArtifact = artifacts.require("Echo");
        echo = await new ethers_1.ContractFactory(echoArtifact.abi, echoArtifact.binary, unlockedAccount).deploy({ gasLimit: 6e9 });
        await testCaller.deployed();
        await echo.deployed();
    });
    describe("execStaticCall", () => {
        const helloWorldString = utils_1.hexlify(utils_1.toUtf8Bytes("hello world"));
        it("retrieves bytes string from external pure function", async () => {
            const ret = await testCaller.functions.execStaticCall(echo.address, echo.interface.functions.helloWorld.sighash, "0x");
            utils_2.expect(ret).to.eq(helloWorldString);
        });
        it("retrieves true bool from external pure function", async () => {
            const ret = await testCaller.functions.execStaticCallBool(echo.address, echo.interface.functions.returnArg.sighash, utils_1.defaultAbiCoder.encode(["bool"], [true]));
            utils_2.expect(ret).to.be.true;
        });
        it("retrieves false bool from external pure function", async () => {
            const ret = await testCaller.functions.execStaticCallBool(echo.address, echo.interface.functions.returnArg.sighash, utils_1.defaultAbiCoder.encode(["bool"], [false]));
            utils_2.expect(ret).to.be.false;
        });
        it("retrieves argument from external pure function", async () => {
            const ret = await testCaller.functions.execStaticCall(echo.address, echo.interface.functions.helloWorldArg.sighash, utils_1.defaultAbiCoder.encode(["string"], ["hello world"]));
            utils_2.expect(ret).to.eq(helloWorldString);
        });
        it("fails to read msg.sender", async () => {
            await utils_2.expect(testCaller.functions.execStaticCall(echo.address, echo.interface.functions.msgSender.sighash, "0x")).to.be.reverted;
        });
        it("reverts if the target is not a contract", async () => {
            await utils_2.expect(testCaller.functions.execStaticCall(utils_1.hexlify(utils_1.randomBytes(20)), echo.interface.functions.helloWorld.sighash, "0x")).to.be.reverted;
        });
    });
});
//# sourceMappingURL=staticCall.spec.js.map