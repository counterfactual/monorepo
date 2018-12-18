"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const constants_1 = require("ethers/constants");
const providers_1 = require("ethers/providers");
const utils_1 = require("ethers/utils");
const solc = __importStar(require("solc"));
const utils_2 = require("./utils");
const provider = new providers_1.Web3Provider(global.web3.currentProvider);
const TEST_CONTRACT_SOLIDITY_CODE = `
  contract Test {
    function sayHello() public pure returns (string) {
      return "hi";
    }
  }`;
contract("ContractRegistry", accounts => {
    let unlockedAccount;
    let contractRegistry;
    let simpleContract;
    function cfaddress(initcode, i) {
        return utils_1.solidityKeccak256(["bytes1", "bytes", "uint256"], ["0x19", initcode, i]);
    }
    before(async () => {
        unlockedAccount = await provider.getSigner(accounts[0]);
    });
    beforeEach(async () => {
        contractRegistry = await new ethers_1.ContractFactory(artifacts.require("ContractRegistry").abi, artifacts.require("ContractRegistry").bytecode, unlockedAccount).deploy({ gasLimit: 6e9 });
        await contractRegistry.deployed();
    });
    it("computes counterfactual addresses of bytes deployments", async () => {
        utils_2.expect(cfaddress(constants_1.HashZero, 1)).to.eq(await contractRegistry.functions.cfaddress(constants_1.HashZero, 1));
    });
    it("deploys a contract", done => {
        const output = solc.compile(TEST_CONTRACT_SOLIDITY_CODE, 0);
        const iface = JSON.parse(output.contracts[":Test"].interface);
        const bytecode = `0x${output.contracts[":Test"].bytecode}`;
        const filter = contractRegistry.filters.ContractCreated(null, null);
        const callback = async (from, to, value, event) => {
            const deployedAddress = value.args.deployedAddress;
            utils_2.expect(deployedAddress).to.eq(await contractRegistry.resolver(cfaddress(bytecode, 2)));
            simpleContract = new ethers_1.Contract(deployedAddress, iface, unlockedAccount);
            utils_2.expect(await simpleContract.sayHello()).to.eq("hi");
            done();
        };
        const registryContract = contractRegistry.on(filter, callback);
        registryContract.deploy(bytecode, 2);
    });
    it("deploys a contract using msg.sender", done => {
        const output = solc.compile(TEST_CONTRACT_SOLIDITY_CODE, 0);
        const iface = JSON.parse(output.contracts[":Test"].interface);
        const bytecode = `0x${output.contracts[":Test"].bytecode}`;
        const filter = contractRegistry.filters.ContractCreated(null, null);
        const callback = async (from, to, value, event) => {
            const deployedAddress = value.args.deployedAddress;
            utils_2.expect(deployedAddress).to.eq(await contractRegistry.resolver(cfaddress(bytecode, 3)));
            simpleContract = new ethers_1.Contract(deployedAddress, iface, unlockedAccount);
            utils_2.expect(await simpleContract.sayHello()).to.eq("hi");
            done();
        };
        const registryContract = contractRegistry.on(filter, callback);
        registryContract.deploy(bytecode, 3);
    });
    it("deploys a Proxy contract contract through as owner", done => {
        const output = solc.compile(TEST_CONTRACT_SOLIDITY_CODE, 0);
        const iface = JSON.parse(output.contracts[":Test"].interface);
        const initcode = artifacts.require("Proxy").bytecode +
            utils_1.defaultAbiCoder.encode(["address"], [simpleContract.address]).substr(2);
        const filter = contractRegistry.filters.ContractCreated(null, null);
        const callback = async (from, to, value, event) => {
            const deployedAddress = value.args.deployedAddress;
            utils_2.expect(deployedAddress).to.eq(await contractRegistry.resolver(cfaddress(initcode, 3)));
            const contract = new ethers_1.Contract(deployedAddress, iface, unlockedAccount);
            utils_2.expect(await contract.sayHello()).to.eq("hi");
            done();
        };
        const registryContract = contractRegistry.on(filter, callback);
        registryContract.deploy(initcode, 3);
    });
    it("deploys a contract and passes arguments", done => {
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
        const output = solc.compile(source, 0);
        const iface = JSON.parse(output.contracts[":Test"].interface);
        const bytecode = `0x${output.contracts[":Test"].bytecode}`;
        const initcode = bytecode + utils_1.defaultAbiCoder.encode(["address"], [accounts[0]]).substr(2);
        const filter = contractRegistry.filters.ContractCreated(null, null);
        const callback = async (from, to, value, event) => {
            const deployedAddress = value.args.deployedAddress;
            utils_2.expect(deployedAddress).to.eq(await contractRegistry.resolver(cfaddress(initcode, 4)));
            const contract = new ethers_1.Contract(deployedAddress, iface, unlockedAccount);
            utils_2.expect(await contract.sayHello()).to.eq(accounts[0]);
            done();
        };
        const registryContract = contractRegistry.on(filter, callback);
        registryContract.deploy(initcode, 4);
    });
});
//# sourceMappingURL=contract-registry.spec.js.map