import { FreeBalance, NetworkContext } from "../types";
import * as ethers from "ethers";

import * as cfOp from "./cf-operation";

const TIMEOUT = 100;

export class CfOpSetup {
	static nonceUpdateOp(
		nonceUniqueId: number,
		multisig: string,
		owners: string[],
		networkContext: NetworkContext
	): cfOp.CfOperation {
		const nonce = generateNonceCfAddress(
			nonceUniqueId,
			multisig,
			owners,
			networkContext
		);

		const nonceStateUpdate = new cfOp.CfAppUpdateAsOwner(
			multisig,
			nonce,
			ethers.utils.AbiCoder.defaultCoder.encode(["uint256"], [1]),
			1
		);

		return nonceStateUpdate;
	}

	static freeBalanceInstallOp(
		uniqueId: number,
		multisig: string,
		owners: string[],
		networkContext: NetworkContext
	): cfOp.CfOperation {
		const FREEBAL_ETH_ID = 2;

		const freeBalanceETH = generateFreeBalanceCfAddress(
			multisig,
			uniqueId,
			owners,
			networkContext
		);
		const nonceCfAddress = generateNonceCfAddress(
			1,
			multisig,
			owners,
			networkContext
		);

		const conditionalTransferForFreeBalanceETH = new cfOp.CfAppInstall(
			multisig,
			new cfOp.App(
				[
					new cfOp.Condition(
						new cfOp.Function(
							new cfOp.Address(networkContext.RegistryAddress, nonceCfAddress),
							"0xb5d78d8c"
						),
						"0x",
						ethers.utils.AbiCoder.defaultCoder.encode(["uint256"], [1])
					)
				],
				new cfOp.Address(networkContext.RegistryAddress, freeBalanceETH),
				[],
				new cfOp.Function(
					new cfOp.Address(
						"0x0000000000000000000000000000000000000000",
						networkContext.AssetDispatcherAddress
					),
					networkContext.AssetDispatcherSighashForETH
				)
			)
		);

		return conditionalTransferForFreeBalanceETH;
	}
}

function generateNonceCfAddress(
	uniqueId: number,
	multisig: string,
	owners: string[],
	networkContext: NetworkContext
) {
	const initcode = ethers.Contract.getDeployTransaction(
		networkContext.WithdrawAppBytecode,
		[]
	).data;
	const calldata = new ethers.Interface([
		"instantiate(address,address[],address,uint256,uint256)"
	]).functions.instantiate(
		multisig,
		owners,
		networkContext.RegistryAddress,
		uniqueId,
		TIMEOUT
	).data;

	return ethers.utils.solidityKeccak256(
		["bytes1", "bytes", "bytes32"],
		["0x19", initcode, ethers.utils.solidityKeccak256(["bytes"], [calldata])]
	);
}

function generateFreeBalanceCfAddress(
	multisigAddress: string,
	uniqueId: number,
	owners: string[],
	networkContext: NetworkContext
) {
	const initcode = ethers.Contract.getDeployTransaction(
		networkContext.WithdrawAppBytecode,
		[]
	).data;

	const calldata = new ethers.Interface([
		"instantiate(address,address[],address,uint256,uint256)"
	]).functions.instantiate(
		multisigAddress,
		owners,
		networkContext.RegistryAddress,
		uniqueId,
		TIMEOUT
	).data;

	return ethers.utils.solidityKeccak256(
		["bytes1", "bytes", "bytes32"],
		["0x19", initcode, ethers.utils.solidityKeccak256(["bytes"], [calldata])]
	);
}
