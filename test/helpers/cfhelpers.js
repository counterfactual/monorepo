const ethers = require("ethers");
const multisigUtils = require("./multisig.js");

const {
	zeroAddress,
	getParamFromTxEvent,
	signMessageVRS,
} = require("./utils.js");

const MinimumViableMultisig = artifacts.require("MinimumViableMultisig");
const CounterfactualApp     = artifacts.require("CounterfactualApp");
const ProxyFactory          = artifacts.require("ProxyFactory");
const ProxyContract         = artifacts.require("Proxy");
const RegistryCallLib       = artifacts.require("RegistryCallLib");

async function deployThroughProxyFactory(contract, data) {
	const proxyFactory = await ProxyFactory.deployed();
	return getParamFromTxEvent(
		await proxyFactory.createProxy(contract.address, data),
		"ProxyCreation",
		"proxy",
		proxyFactory.address,
		contract,
	);
}

async function deployApp(owner, signingKeys, id, registry, deltaTimeout) {
	return await deployThroughProxyFactory(
		CounterfactualApp,
		new ethers
			.Interface(CounterfactualApp.abi)
			.functions
			.instantiate(owner, signingKeys, id, registry, deltaTimeout)
			.data
	);
}

async function deployMultisig(owners) {
	return await deployThroughProxyFactory(
		MinimumViableMultisig,
		new ethers
			.Interface(MinimumViableMultisig.abi)
			.functions
			.setup(owners)
			.data
	);
}

function getCFHelper(multisig, registry, provider) {
	return {
		deployAppWithState: async (state, signer) => {
			const id = Math.floor(Math.random() * 100);

			const initcode = ethers.Contract.getDeployTransaction(
				ProxyContract.bytecode,
				ProxyContract.abi,
				CounterfactualApp.address,
			).data;

			const calldata = new ethers
				.Interface(CounterfactualApp.abi)
				.functions
				.instantiate(
					multisig.address,
					[signer.address],
					registry.address,
					id,
					10
				)
				.data;

			await registry.deployAndCall(
				initcode,
				calldata,
				{
					gasLimit: 4712388,
					gasPrice: await provider.getGasPrice()
				},
			);

			const cfaddress = ethers.utils.solidityKeccak256(
				["bytes1", "bytes", "bytes32"],
				["0x19", initcode, ethers.utils.solidityKeccak256(["bytes"], [calldata])],
			);

			const address = await registry.isDeployed(cfaddress);

			const contract = new ethers.Contract(
				address,
				CounterfactualApp.abi,
				provider.getSigner()
			);

			const updateHash = await contract.getUpdateHash(id, state, 1);

			await contract.setStateWithSigningKeys(
				state,
				1,
				signMessageVRS(updateHash, signer),
				{
					gasLimit: 4712388,
					gasPrice: await provider.getGasPrice()
				},
			);

			return { cfaddress, contract };
		},
		deploy: async (truffleContract, cargs) => {
			const id = Math.floor(Math.random() * 100);

			const initcode = ethers.Contract.getDeployTransaction(
				truffleContract.binary,
				truffleContract.abi,
				...(cargs || []),
			).data;

			const salt = ethers.utils.solidityKeccak256(["uint256"], [id]);

			await registry.deploy(initcode, salt, {
				gasLimit: 4712388,
				gasPrice: await provider.getGasPrice()
			});

			const cfaddress = ethers.utils.solidityKeccak256(
				["bytes1", "bytes", "bytes32"],
				["0x19", initcode, salt],
			);

			const address = await registry.isDeployed(cfaddress);

			const contract = new ethers.Contract(
				address,
				truffleContract.abi,
				provider.getSigner()
			);

			return { cfaddress, contract };
		},
		_proxyFn: async (callType, cfobject, signer, fnName, fnArgs) => {
			const data = new ethers
				.Interface(RegistryCallLib.abi)
				.functions[callType](
					registry.address,
					cfobject.cfaddress,
					new ethers
						.Interface(cfobject.contract.interface.abi)
						.functions[fnName](...(fnArgs || []))
						.data
				)
				.data;

			return await multisigUtils.executeTxData(
				data,
				RegistryCallLib.address,
				multisig,
				[signer],
				multisigUtils.Operation.Delegatecall,
			);
		},
		_fn: async (callType, to, signer, data) => {
			return await multisigUtils.executeTxData(
				data,
				to,
				multisig,
				[signer],
				callType,
			);
		},
		call: async function (...args) {
			return await this._fn(multisigUtils.Operation.Call, ...args);
		},
		delegatecall: async function (...args) {
			return await this._fn(multisigUtils.Operation.Delegatecall, ...args);
		},
		proxyCall: async function (...args) {
			return await this._proxyFn("proxyCall", ...args);
		},
		proxyDelegatecall: async function (...args) {
			return await this._proxyFn("proxyDelegatecall", ...args);
		},
		cfaddressOf: (contract) => {
			if (contract.address) {
				return {
					registry: zeroAddress,
					addr: ethers.utils.AbiCoder.defaultCoder.encode(
						["bytes32"], [contract.address]
					),
				};
			} else {
				return {
					registry: registry.address,
					addr: contract.cfaddress,
				};
			}
		},
	};
}

module.exports = {
	getCFHelper,
	deployMultisig,
	deployApp,
	deployThroughProxyFactory,
};
