import * as ethers from "ethers";
import { StateChannelContext } from "../delete_me";
import { CfApp } from "../../machine/types";
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
} from "./contracts-layer-constants";

const TIMEOUT = 100;
const GET_STATE_SIGHASH = "0xb5d78d8c";

export class CfOpInstall {
	static operation(
		ctx: StateChannelContext,
		signingKeys: Array<string>
	): CfOperation {
		// todo
		let app = null;

		let updateFreeBalance = CfOpInstall.updateFreeBalance(ctx, app);
		let installCondTransfer = CfOpInstall.installCondTransfer(ctx, app);

		let ops = [updateFreeBalance, installCondTransfer];

		return new CFMultiOp(ops, ctx.multisigAddr);
	}

	private static updateNonce(ctx: StateChannelContext): CfAppUpdateAsOwner {
		const nonceCfAddress = CfOpInstall.cfAddress(
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
		app: CfApp
	): CfAppUpdateAsOwner {
		const freeBalanceCfAddress = CfOpInstall.cfAddress(
			ctx,
			ctx.getOwners(),
			ctx.system.freeBalance.uniqueId,
			TIMEOUT
		);
		let freeBal = ctx.system.freeBalance;
		const newBals = freeBal.deduct(app.peerAmounts);
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

	private static installCondTransfer(
		ctx: StateChannelContext,
		app: CfApp
	): CfAppInstall {
		let condTransferApp = CfOpInstall.condTransferApp(ctx, app);
		return new CfAppInstall(ctx.multisigAddr, condTransferApp);
	}

	private static condTransferApp(ctx: StateChannelContext, app: CfApp): App {
		let address = CfOpInstall.address(ctx, app);
		let conditions = [CfOpInstall.nonceCondition(ctx, address.cfaddress)];
		let pipeline = CfOpInstall.pipeline(ctx, app, address.cfaddress);
		let payoutFn = CfOpInstall.payoutFn(ctx);

		return new App(conditions, address, pipeline, payoutFn);
	}

	private static address(ctx: StateChannelContext, app: CfApp): Address {
		let cfAddress = CfOpInstall.cfAddress(
			ctx,
			app.signingKeys,
			app.uniqueId, // figure out actual type here
			TIMEOUT
		);
		return new Address(ctx.networkContext["RegistryAddress"], cfAddress);
	}

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

	private static nonceCondition(
		ctx: StateChannelContext,
		appCfAddr: string
	): Condition {
		let nonceUniqueId = ethers.utils.solidityKeccak256(
			["bytes32"],
			[appCfAddr]
		);
		let nonceCfAddr = CfOpInstall.cfAddress(
			ctx,
			ctx.getOwners(),
			nonceUniqueId,
			TIMEOUT
		);

		return new Condition(
			new Function(
				new Address(ctx.networkContext["RegistryAddress"], nonceCfAddr),
				GET_STATE_SIGHASH
			),
			"0x",
			ethers.utils.AbiCoder.defaultCoder.encode(["uint256"], [1])
		);
	}

	private static pipeline(
		ctx: StateChannelContext,
		app: CfApp,
		appCfAddr: string
	): Array<Function> {
		return [
			new Function(
				new Address(ctx.networkContext["RegistryAddress"], appCfAddr),
				app.interpreterSigHash
			)
		];
	}

	private static payoutFn(ctx: StateChannelContext): Function {
		return new Function(
			new Address(zeroAddress, ctx.networkContext["AssetDispatcherAddress"]),
			ctx.networkContext["AssetDispatcherSighashForETH"]
		);
	}
}
