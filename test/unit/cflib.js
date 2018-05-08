const ethers = require("ethers");
const utils = require("../helpers/utils");

const CFLibTester = artifacts.require("CFLibTester");
const MockRegistry = artifacts.require("MockRegistry");

contract('CFLibTester', (accounts) => {

	const provider = new ethers.providers.Web3Provider(web3.currentProvider);
	const signer = provider.getSigner();

	it('should lookup a regular address', async() => {
		await runCFAddressTest(
			utils.zeroAddress,
			utils.toBytes32Str(accounts[0]),
			accounts[0]
		)
	});

	it('should lookup a counterfactual address', async() => {
		let registry = await MockRegistry.new();
		await registry.setLookup(utils.zeroBytes32, accounts[0]);

		await runCFAddressTest(
			registry.address,
			utils.zeroBytes32,
			accounts[0]
		);
	});

	async function runCFAddressTest(registryAddr, addr32, expectedAddr) {
		let cfAddr = {
			registry: registryAddr,
			addr: addr32
		};
		let cfLibTester = await utils.deployContract(
			CFLibTester,
			[cfAddr],
			signer,
			provider
		);
		let result = await cfLibTester.lookup();
		assert.equal(result.toLowerCase(), expectedAddr.toLowerCase());
	}

})
