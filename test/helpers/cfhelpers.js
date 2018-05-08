const ethers = require("ethers");
const gnosisSafeUtils = require("./gnosis_safe.js");

const {
	zeroAddress,
	zeroBytes32,
	getParamFromTxEvent,
} = require("./utils.js");

const GnosisSafe   = artifacts.require("GnosisSafe");
const ProxyFactory = artifacts.require("ProxyFactory");

async function deployMultisig(owners) {
	const proxyFactory = await ProxyFactory.deployed();
	return getParamFromTxEvent(
		await proxyFactory.createProxy(
			GnosisSafe.address,
			new ethers
				.Interface(GnosisSafe.abi)
				.deployFunction("0x", owners, 1, zeroAddress, zeroBytes32)
				.bytecode
		),
		"ProxyCreation",
		"proxy",
		proxyFactory.address,
		GnosisSafe,
	);
}

function getCFDeployer(multisig, registry, provider) {
	return {
		deploy: async (contract, signer, cargs) => {
			const bytecode = ethers.Contract.getDeployTransaction(
				contract.binary,
				contract.abi,
				...(cargs || []),
				{
					owner: multisig.address,
					registry: registry.address,
					id: 0,
					deltaTimeout: 10,
					finalizesAt: 0,
					latestNonce: 0,
					wasDeclaredFinal: false,
					dependancy: {
						addr: "0x0",
						nonce: 0,
					}
				},
			).data;
			const data = new ethers
				.Interface(registry.abi)
				.functions
				.deployAsOwner(bytecode)
				.data;
			await gnosisSafeUtils.executeTxData(
				data,
				registry.address,
				multisig,
				[signer],
				gnosisSafeUtils.Operation.Call
			);
			const cfaddress = ethers.utils.solidityKeccak256(
				["bytes", "address[]"],
				[bytecode, [multisig.address]]
			);
			return {
				cfaddress,
				contract: new ethers.Contract(
					await registry.resolve(cfaddress),
					contract.abi,
					provider.getSigner(),
				)
			};
		},
		_callOrDelegateCall: async (callType, cfobject, signer, fnName, fnArgs) => {
			const data = new ethers
				.Interface(registry.abi)
				.functions[callType](
					registry.address,
					cfobject.cfaddress,
					new ethers
						.Interface(cfobject.contract.interface.abi)
						.functions[fnName](...fnArgs)
						.data
				)
				.data;
			await gnosisSafeUtils.executeTxData(
				data,
				registry.address,
				multisig,
				[signer],
				gnosisSafeUtils.Operation.Delegatecall
			);
		},
		call: async function (...args) {
			await this._callOrDelegateCall("proxyCall", ...args);
		},
		delegatecall: async function (...args) {
			await this._callOrDelegateCall("proxyDelegatecall", ...args);
		}
	};
}

// TODO Get rid of use cases of this for the approach above
async function executeProxyCall(
	data,
	registry,
	cfAddr,
	multiSig,
	wallets
) {
	let proxyCallData = registry
		.interface
		.functions
		.proxyCall(
			registry.address,
			cfAddr,
			data
		).data;

	await gnosisSafeUtils.executeTxData(
		proxyCallData,
		registry.address,
		multiSig,
		wallets,
		gnosisSafeUtils.Operation.Delegatecall
	);
}

module.exports = {
	getCFDeployer,
	executeProxyCall,
	deployMultisig
};
