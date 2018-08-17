"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ethers = require("ethers");
const solc = require("solc");
const Utils = require("@counterfactual/test-utils");
const ProxyContract = artifacts.require("Proxy");
const Registry = artifacts.require("Registry");
contract("Registry", accounts => {
    const web3 = global.web3;
    let registry;
    let simpleContract;
    function cfaddress(initcode, i) {
        return ethers.utils.solidityKeccak256(["bytes1", "bytes", "uint256"], ["0x19", initcode, i]);
    }
    before(async () => {
        registry = await Registry.new();
    });
    it("computes counterfactual addresses of bytes deployments", async () => {
        chai_1.assert.equal(cfaddress(Utils.ZERO_BYTES32, 1), await registry.cfaddress(Utils.ZERO_BYTES32, 1));
    });
    it("deploys a contract", async () => {
        const source = `
      contract Test {
        function sayHello() public pure returns (string) {
          return "hi";
        }
      }`;
        const output = await solc.compile(source, 0);
        const iface = JSON.parse(output.contracts[":Test"].interface);
        const bytecode = "0x" + output.contracts[":Test"].bytecode;
        const TestContract = web3.eth.contract(iface);
        const tx = await registry.deploy(bytecode, 2);
        simpleContract = Utils.getParamFromTxEvent(tx, "ContractCreated", "deployedAddress", registry.address, TestContract);
        chai_1.assert.equal(await simpleContract.address, await registry.resolver(cfaddress(bytecode, 2)));
        chai_1.assert.equal("hi", await simpleContract.sayHello());
    });
    it("deploys a contract using msg.sender", async () => {
        const source = `
        contract Test {
            function sayHello() public pure returns (string) {
                return "hi";
            }
        }`;
        const output = await solc.compile(source, 0);
        const iface = JSON.parse(output.contracts[":Test"].interface);
        const bytecode = "0x" + output.contracts[":Test"].bytecode;
        const TestContract = web3.eth.contract(iface);
        const tx = await registry.deploy(bytecode, 3);
        const testContract = Utils.getParamFromTxEvent(tx, "ContractCreated", "deployedAddress", registry.address, TestContract);
        chai_1.assert.equal(await testContract.address, await registry.resolver(cfaddress(bytecode, 3)));
        chai_1.assert.equal("hi", await testContract.sayHello());
    });
    it("deploys a ProxyContract contract through as owner", async () => {
        const initcode = ProxyContract.bytecode +
            ethers.utils.defaultAbiCoder
                .encode(["address"], [simpleContract.address])
                .substr(2);
        const TestContract = web3.eth.contract(simpleContract.abi);
        const tx = await registry.deploy(initcode, 3);
        const testContract = Utils.getParamFromTxEvent(tx, "ContractCreated", "deployedAddress", registry.address, TestContract);
        chai_1.assert.equal(await testContract.address, await registry.resolver(cfaddress(initcode, 3)));
        chai_1.assert.equal("hi", await testContract.sayHello());
    });
    it("deploys a contract and passes arguments", async () => {
        const source = `
        contract Test {
            address whatToSay;
            function Test(address _whatToSay) public {
                whatToSay = _whatToSay;
            }
            function sayHello() public view returns (address) {
                return whatToSay;
            }
        }`;
        const output = await solc.compile(source, 0);
        const iface = JSON.parse(output.contracts[":Test"].interface);
        const bytecode = "0x" + output.contracts[":Test"].bytecode;
        const code = bytecode +
            ethers.utils.defaultAbiCoder.encode(["address"], [accounts[0]]).substr(2);
        const TestContract = web3.eth.contract(iface);
        const tx = await registry.deploy(code, 4);
        const testContract = Utils.getParamFromTxEvent(tx, "ContractCreated", "deployedAddress", registry.address, TestContract);
        chai_1.assert.equal(await testContract.address, await registry.resolver(cfaddress(code, 4)));
        chai_1.assert.equal(accounts[0], await testContract.sayHello());
    });
});
//# sourceMappingURL=registry.spec.js.map