import * as ethers from "ethers";

import * as cfOp from "./cf-operation";
import { StateChannelContext } from "../state-channel";

export class CfOpSetup {
  static operations(
		ctx: StateChannelContext
  ): Array<cfOp.CfOperation> {
		const NONCE_ID = 1;
		const FREEBAL_ETH_ID = 2;
		const TIMEOUT = 100;

		const nonce = (() => {
			const initcode = ethers.Contract.getDeployTransaction(
				ctx.networkContext["WithdrawAppBytecode"],
				[]
			).data;

			const calldata = new ethers.Interface([
				"instantiate(address,address[],address,uint256,uint256)"
			]).functions.instantiate(
				ctx.multisigAddr,
				ctx.getOwners(),
				ctx.networkContext["RegistryAddress"],
				NONCE_ID,
				TIMEOUT
			).data;

			return ethers.utils.solidityKeccak256(
				["bytes1", "bytes", "bytes32"],
				[
					"0x19",
					initcode,
					ethers.utils.solidityKeccak256(["bytes"], [calldata])
				]
			);
		})();

		const freeBalanceETH = (() => {
			const initcode = ethers.Contract.getDeployTransaction(
				ctx.networkContext["WithdrawAppBytecode"],
				[]
			).data;

			const calldata = new ethers.Interface([
				"instantiate(address,address[],address,uint256,uint256)"
			]).functions.instantiate(
				ctx.multisigAddr,
				ctx.getOwners(),
				ctx.networkContext["RegistryAddress"],
				FREEBAL_ETH_ID,
				TIMEOUT
			).data;

			return ethers.utils.solidityKeccak256(
				["bytes1", "bytes", "bytes32"],
				[
					"0x19",
					initcode,
					ethers.utils.solidityKeccak256(["bytes"], [calldata])
				]
			);
		})();

		const nonceStateUpdate = new cfOp.CfAppUpdateAsOwner(
			ctx.multisigAddr,
			nonce,
			ethers.utils.AbiCoder.defaultCoder.encode(["uint256"], [1]),
			1
		);

		const conditionalTransferForFreeBalanceETH = new cfOp.CfAppInstall(
			ctx.multisigAddr,
			new cfOp.App(
				[
					new cfOp.Condition(
						new cfOp.Function(
							new cfOp.Address(
								ctx.networkContext["RegistryAddress"],
								nonce
							),
							"0xb5d78d8c"
						),
						"0x",
						ethers.utils.AbiCoder.defaultCoder.encode(["uint256"], [1])
					)
				],
				new cfOp.Address(
					ctx.networkContext["RegistryAddress"],
					freeBalanceETH
				),
				[],
				new cfOp.Function(
					new cfOp.Address(
						"0x0000000000000000000000000000000000000000",
						ctx.networkContext["AssetDispatcherAddress"]
					),
					ctx.networkContext["AssetDispatcherSighashForETH"]
				)
			)
		);

		return [nonceStateUpdate, conditionalTransferForFreeBalanceETH];
  }
}