const ethers = require("ethers");
const solc = require("solc");

const {
	zeroBytes32,
	getParamFromTxEvent,
} = require("../helpers/utils.js");

const ProxyContract = artifacts.require("Proxy");
const Registry = artifacts.require("Registry");

contract("Registry", (accounts) => {

	let registry, simpleContract;

	function salt(i) {
		return ethers.utils.AbiCoder.defaultCoder.encode(["uint256"], [i]);
	}

	function cfaddress(bytecode, i) {
		return ethers.utils.solidityKeccak256(
			["bytes1", "bytes", "bytes32"],
			["0x19", bytecode, salt(i)]
		);
	}

	before(async () => {
		registry = await Registry.new();
	});

	it("computes counterfactual addresses of bytes deployments", async () => {
		assert.equal(
			cfaddress(zeroBytes32, salt(1)),
			await registry.getCounterfactualAddress(zeroBytes32, salt(1))
		);
	});

	it("deploys a contract", async () => {

		let source = `
        contract Test {
            function sayHello() public pure returns (string) {
                return "hi";
			}
        }`;
		let output = await solc.compile(source, 0);
		let interface = JSON.parse(output.contracts[":Test"]["interface"]);
		let bytecode = "0x" + output.contracts[":Test"]["bytecode"];

		const TestContract = web3.eth.contract(interface);
		const tx = await registry.deploy(bytecode, salt(2));
		simpleContract = getParamFromTxEvent(
			tx, "ContractCreated", "deployedAddress", registry.address, TestContract,
		);

		assert.equal(
			await simpleContract.address,
			await registry.isDeployed(cfaddress(bytecode, salt(2)))
		);

		assert.equal("hi", await simpleContract.sayHello());
	});

	it("deploys a contract using msg.sender", async () => {

		let source = `
        contract Test {
            function sayHello() public pure returns (string) {
                return "hi";
            }
        }`;
		let output = await solc.compile(source, 0);
		let interface = JSON.parse(output.contracts[":Test"]["interface"]);
		let bytecode = "0x" + output.contracts[":Test"]["bytecode"];

		const TestContract = web3.eth.contract(interface);
		const tx = await registry.deploy(bytecode, salt(3));
		const testContract = getParamFromTxEvent(
			tx, "ContractCreated", "deployedAddress", registry.address, TestContract,
		);

		assert.equal(
			await testContract.address,
			await registry.isDeployed(cfaddress(bytecode, salt(3)))
		);

		assert.equal("hi", await testContract.sayHello());
	});

	it("deploys a ProxyContract contract through as owner", async () => {

		const initcode = ProxyContract.bytecode + ethers.utils.AbiCoder.defaultCoder.encode(
			["address"], [simpleContract.address]
		).substr(2);

		const TestContract = web3.eth.contract(simpleContract.abi);

		const tx = await registry.deploy(initcode, salt(3));
		const testContract = getParamFromTxEvent(
			tx, "ContractCreated", "deployedAddress", registry.address, TestContract,
		);

		assert.equal(
			await testContract.address,
			await registry.isDeployed(cfaddress(initcode, salt(3)))
		);

		assert.equal("hi", await testContract.sayHello());
	});

	it("deploys a contract and passes arguments", async () => {

		let source = `
        contract Test {
            address whatToSay;
            function Test(address _whatToSay) public {
                whatToSay = _whatToSay;
            }
            function sayHello() public view returns (address) {
                return whatToSay;
            }
        }`;
		let output = await solc.compile(source, 0);
		let interface = JSON.parse(output.contracts[":Test"]["interface"]);
		let bytecode = "0x" + output.contracts[":Test"]["bytecode"];

		const code = bytecode + ethers.utils.AbiCoder.defaultCoder.encode(
			["address"], [accounts[0]]
		).substr(2);

		const TestContract = web3.eth.contract(interface);
		const tx = await registry.deploy(code, salt(4));
		const testContract = getParamFromTxEvent(
			tx, "ContractCreated", "deployedAddress", registry.address, TestContract,
		);

		assert.equal(
			await testContract.address,
			await registry.isDeployed(cfaddress(code, salt(4)))
		);

		assert.equal(accounts[0], await testContract.sayHello());

	});
});
