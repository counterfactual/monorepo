import * as ethers from "ethers";

import * as Multisig from "./multisig";
import * as Utils from "./utils";

const MinimumViableMultisig = artifacts.require("MinimumViableMultisig");
const CounterfactualApp = artifacts.require("CounterfactualApp");
const ProxyFactory = artifacts.require("ProxyFactory");
const ProxyContract = artifacts.require("Proxy");
const RegistryCallLib = artifacts.require("RegistryCallLib");

export async function deployThroughProxyFactory(contract, data) {
	const proxyFactory = await ProxyFactory.deployed();
	return Utils.getParamFromTxEvent(
		await (proxyFactory as any).createProxy(contract.address, data),
		"ProxyCreation",
		"proxy",
		proxyFactory.address,
		contract
	);
}

export async function deployApp(
	owner,
	signingKeys,
	id,
	registry,
	deltaTimeout
) {
	return deployThroughProxyFactory(
		CounterfactualApp,
		new ethers.Interface(CounterfactualApp.abi).functions.instantiate.encode([
			owner,
			signingKeys,
			id,
			registry,
			deltaTimeout
		])
	);
}

export async function deployMultisig(owners) {
	return deployThroughProxyFactory(
		MinimumViableMultisig,
		new ethers.Interface(MinimumViableMultisig.abi).functions.setup.encode([
			owners
		])
	);
}

export function getCFHelper(
	multisig: ethers.Contract,
	registry: ethers.Contract,
	provider: ethers.providers.Web3Provider,
) {
	return {
		cfaddressOf: contract => {
			if (contract.address) {
				return {
					addr: ethers.utils.defaultAbiCoder.encode(
						["bytes32"],
						[contract.address]
					),
					registry: Utils.zeroAddress
				};
			} else {
				return {
					addr: contract.cfaddress,
					registry: registry.address
				};
			}
		},
		deploy: async (truffleContract, cargs?: any[]) => {
			const id = Math.floor(Math.random() * 100);

			const initcode = new ethers.Interface(
				truffleContract.abi
			).deployFunction.encode(truffleContract.binary, cargs || []);

			const salt = ethers.utils.solidityKeccak256(["uint256"], [id]);

			await registry.functions.deploy(initcode, salt, {
				gasLimit: 4712388,
				gasPrice: await provider.getGasPrice()
			});

			const cfaddress = ethers.utils.solidityKeccak256(
				["bytes1", "bytes", "bytes32"],
				["0x19", initcode, salt]
			);

			const address = await registry.functions.isDeployed(cfaddress);

			const contract = new ethers.Contract(
				address,
				truffleContract.abi,
				// @ts-ignore: ethers bug, no argument works too
				provider.getSigner()
			);

			return { cfaddress, contract };
		},
		deployAppWithState: async (state, signer) => {
			const id = Math.floor(Math.random() * 100);

			const initcode = new ethers.Interface(
				ProxyContract.abi
			).deployFunction.encode(ProxyContract.bytecode, [
				(CounterfactualApp as any).address
			]);

			const calldata = new ethers.Interface(
				CounterfactualApp.abi
			).functions.instantiate.encode([
				multisig.address,
				[signer.address],
				registry.address,
				id,
				10
			]);

			await registry.functions.deployAndCall(initcode, calldata, {
				gasLimit: 4712388,
				gasPrice: await provider.getGasPrice()
			});

			const cfaddress = ethers.utils.solidityKeccak256(
				["bytes1", "bytes", "bytes32"],
				[
					"0x19",
					initcode,
					ethers.utils.solidityKeccak256(["bytes"], [calldata])
				]
			);

			const address = await registry.functions.isDeployed(cfaddress);

			const contract = new ethers.Contract(
				address,
				CounterfactualApp.abi,
				// @ts-ignore: ethers bug, no argument works too
				provider.getSigner()
			);

			const updateHash = await (contract as any).getUpdateHash(id, state, 1);

			await (contract as any).setStateWithSigningKeys(
				state,
				1,
				Utils.signMessageVRS(updateHash, [signer]),
				{
					gasLimit: 4712388,
					gasPrice: await provider.getGasPrice()
				}
			);

			return { cfaddress, contract };
		},
		async call(to, signer, data) {
			return this.fn(Multisig.Operation.Call, to, signer, data);
		},
		async delegatecall(to, signer, data) {
			return this.fn(Multisig.Operation.Delegatecall, to, signer, data);
		},
		async proxyCall(cfobject, signer, fnName, fnArgs) {
			return this.proxyFn("proxyCall", cfobject, signer, fnName, fnArgs);
		},
		async proxyDelegatecall(cfobject, signer, fnName, fnArgs) {
			return this.proxyFn(
				"proxyDelegatecall",
				cfobject,
				signer,
				fnName,
				fnArgs
			);
		},
		fn: async (callType, to, signer, data) => {
			return Multisig.executeTxData(data, to, multisig, [signer], callType);
		},
		proxyFn: async (callType, cfobject, signer, fnName, fnArgs) => {
			const data = new ethers.Interface(RegistryCallLib.abi).functions[
				callType
			].encode([
				registry.address,
				cfobject.cfaddress,
				new ethers.Interface(cfobject.contract.interface.abi).functions[
					fnName
				].encode(fnArgs || [])
			]);

			return Multisig.executeTxData(
				data,
				(RegistryCallLib as any).address,
				multisig,
				[signer],
				Multisig.Operation.Delegatecall
			);
		}
	};
}
