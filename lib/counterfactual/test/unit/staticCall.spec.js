"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers = require("ethers");
const Utils = require("@counterfactual/test-utils");
const StaticCall = artifacts.require("StaticCall");
const TestCaller = artifacts.require("TestCaller");
const Echo = artifacts.require("Echo");
const web3 = global.web3;
const { unlockedAccount } = Utils.setupTestEnv(web3);
TestCaller.link("StaticCall", StaticCall.address);
contract("StaticCall", (accounts) => {
    let testCaller;
    let echo;
    before(async () => {
        testCaller = await Utils.deployContract(TestCaller, unlockedAccount);
        echo = await Utils.deployContract(Echo, unlockedAccount);
    });
    describe("execStaticCall", () => {
        it("retrieves bytes string from external pure function", async () => {
            const helloWorldString = ethers.utils.hexlify(ethers.utils.toUtf8Bytes("hello world"));
            const ret = await testCaller.functions.execStaticCall(echo.address, echo.interface.functions.helloWorld.sighash, "0x");
            ret.should.be.equal(helloWorldString);
        });
        it("retrieves true bool from external pure function", async () => {
            const ret = await testCaller.functions.execStaticCallBool(echo.address, echo.interface.functions.returnArg.sighash, ethers.utils.defaultAbiCoder.encode(["bool"], [true]));
            ret.should.be.equal(true);
        });
        it("retrieves false bool from external pure function", async () => {
            const ret = await testCaller.functions.execStaticCallBool(echo.address, echo.interface.functions.returnArg.sighash, ethers.utils.defaultAbiCoder.encode(["bool"], [false]));
            ret.should.be.equal(false);
        });
        it("retrieves argument from external pure function", async () => {
            const helloWorldString = ethers.utils.defaultAbiCoder.encode(["string"], ["hello world"]);
            const ret = await testCaller.functions.execStaticCall(echo.address, echo.interface.functions.helloWorldArg.sighash, helloWorldString);
            ret.should.be.equal(ethers.utils.hexlify(ethers.utils.toUtf8Bytes("hello world")));
        });
        it("fails to read msg.sender", async () => {
            await Utils.assertRejects(testCaller.functions.execStaticCall(echo.address, echo.interface.functions.msgSender.sighash, "0x"));
        });
        it("reverts if the target is not a contract", async () => {
            await Utils.assertRejects(testCaller.functions.execStaticCall(ethers.utils.hexlify(ethers.utils.randomBytes(20)), echo.interface.functions.helloWorld.sighash, "0x"));
        });
    });
});
//# sourceMappingURL=staticCall.spec.js.map