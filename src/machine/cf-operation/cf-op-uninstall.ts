import * as ethers from "ethers";
import { StateChannelContext } from "../../protocols/state-channel";
import { CfPeerAmount } from "../../machine/types";
import {
	CfOperation,
	CFMultiOp,
	CfAppUpdateAsOwner,
	CfAppInstall,
	App,
	Address,
	Condition,
	Function
} from "./cf-operation";

import {
	zeroAddress,
	Proxy as ProxyContract
} from "../../protocols/contracts-layer-constants";

const TIMEOUT = 100;
const GET_STATE_SIGHASH = "0xb5d78d8c";

export class CfOpUninstall {
	static operation(
		ctx: StateChannelContext,
		peerAmounts: CfPeerAmount[]
	): CfOperation {
		let updateFreeBalance = CfOpUninstall.updateFreeBalance(ctx, peerAmounts);

		let bumpNonce = CfOpUninstall.updateNonce(ctx);

		let ops = [updateFreeBalance, bumpNonce];
		//let ops = [bumpNonce];
		return new CFMultiOp(ops, ctx.multisigAddr);
	}

	private static updateNonce(ctx: StateChannelContext): CfAppUpdateAsOwner {
		const nonceCfAddress = CfOpUninstall.cfAddress(
			ctx,
			ctx.getOwners(),
			ctx.system.nonce.uniqueId,
			TIMEOUT
		);

		let newNonce = ctx.system.nonce.incrementNonce();
		const nonceState = ethers.utils.AbiCoder.defaultCoder.encode(
			["uint256"],
			[newNonce]
		);
		return new CfAppUpdateAsOwner(
			ctx.multisigAddr,
			nonceCfAddress,
			nonceState,
			newNonce
		);
	}

	private static updateFreeBalance(
		ctx: StateChannelContext,
		peerAmounts: Array<CfPeerAmount>
	): CfAppUpdateAsOwner {
		const freeBalanceCfAddress = CfOpUninstall.cfAddress(
			ctx,
			ctx.getOwners(),
			ctx.system.freeBalance.uniqueId,
			TIMEOUT
		);
		let freeBal = ctx.system.freeBalance;
		const newBals = freeBal.add(peerAmounts);
		const freeBalanceState = ethers.utils.AbiCoder.defaultCoder.encode(
			["tuple(tuple(address,bytes32),uint256)[]"],
			[
				[
					[
						[
							zeroAddress,
							ethers.utils.AbiCoder.defaultCoder.encode(
								["bytes32"],
								[newBals[0].addr]
							)
						],
						newBals[0].amount.toString()
					],
					[
						[
							zeroAddress,
							ethers.utils.AbiCoder.defaultCoder.encode(
								["bytes32"],
								[newBals[1].addr]
							)
						],
						newBals[1].amount.toString()
					]
				]
			]
		);
		const freeBalanceNonce = ctx.system.freeBalance.incrementNonce();
		return new CfAppUpdateAsOwner(
			ctx.multisigAddr,
			freeBalanceCfAddress,
			freeBalanceState,
			freeBalanceNonce
		);
	}

	// TODO: Generalize for all cf ops
	private static cfAddress(
		ctx: StateChannelContext,
		signingKeys: Array<string>,
		uniqueId: number,
		timeout: number
	): string {
		const initcode = ethers.Contract.getDeployTransaction(
			ProxyContract.bytecode,
			ProxyContract.abi,
			ctx.networkContext["CounterfactualAppAddress"]
		).data;

		const calldata = new ethers.Interface([
			"instantiate(address,address[],address,uint256,uint256)"
		]).functions.instantiate(
			ctx.multisigAddr,
			signingKeys,
			ctx.networkContext["RegistryAddress"],
			uniqueId,
			timeout
		).data;

		return ethers.utils.solidityKeccak256(
			["bytes1", "bytes", "bytes32"],
			["0x19", initcode, ethers.utils.solidityKeccak256(["bytes"], [calldata])]
		);
	}
}
