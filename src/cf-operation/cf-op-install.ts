import * as ethers from "ethers";
import { CfApp, NetworkContext, FreeBalance, PeerBalance } from "../types";
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
		ctx: NetworkContext,
		multisig: string,
		freeBalance: FreeBalance,
		channelKeys: Array<string>,
		appKeys: Array<string>,
		app: CfApp
	): [CfOperation, string] {
		let updateFreeBalance = CfOpInstall.updateFreeBalance(
			ctx,
			multisig,
			freeBalance,
			channelKeys,
			app
		);
		let installCondTransfer = CfOpInstall.installCondTransfer(
			ctx,
			multisig,
			channelKeys,
			app
		);

		let ops = [updateFreeBalance, installCondTransfer];

		let cfAddr = installCondTransfer.app.appAddress.cfaddress;
		return [new CFMultiOp(ops, multisig), cfAddr];
	}

	private static updateFreeBalance(
		ctx: NetworkContext,
		multisig: string,
		freeBalance: FreeBalance,
		channelKeys: Array<string>,
		app: CfApp
	): CfAppUpdateAsOwner {
		const freeBalanceCfAddress = CfOpInstall.cfAddress(
			ctx,
			multisig,
			channelKeys,
			freeBalance.uniqueId,
			TIMEOUT
		);
		const newBals = PeerBalance.subtract(
			[freeBalance.peerA, freeBalance.peerB],
			app.peerAmounts
		);
		const freeBalanceState = ethers.utils.defaultAbiCoder.encode(
			["tuple(tuple(address,bytes32),uint256)[]"],
			[
				[
					[
						[
							zeroAddress,
							ethers.utils.defaultAbiCoder.encode(
								["address"],
								[newBals[0].address]
							)
						],
						newBals[0].balance.toString()
					],
					[
						[
							zeroAddress,
							ethers.utils.defaultAbiCoder.encode(
								["address"],
								[newBals[1].address]
							)
						],
						newBals[1].balance.toString()
					]
				]
			]
		);
		const freeBalanceNonce = freeBalance.localNonce + 1;
		return new CfAppUpdateAsOwner(
			multisig,
			freeBalanceCfAddress,
			freeBalanceState,
			freeBalanceNonce
		);
	}

	private static installCondTransfer(
		ctx: NetworkContext,
		multisig: string,
		channelKeys: Array<string>,
		app: CfApp
	): CfAppInstall {
		let condTransferApp = CfOpInstall.condTransferApp(
			ctx,
			multisig,
			channelKeys,
			app
		);
		return new CfAppInstall(multisig, condTransferApp);
	}

	private static condTransferApp(
		ctx: NetworkContext,
		multisig: string,
		channelKeys: Array<string>,
		app: CfApp
	): App {
		let address = CfOpInstall.address(ctx, multisig, app);
		let conditions = [
			CfOpInstall.nonceCondition(ctx, multisig, channelKeys, address.cfaddress)
		];
		let pipeline = CfOpInstall.pipeline(ctx, app, address.cfaddress);
		let payoutFn = CfOpInstall.payoutFn(ctx);

		return new App(conditions, address, pipeline, payoutFn);
	}

	private static address(
		ctx: NetworkContext,
		multisig: string,
		app: CfApp
	): Address {
		let cfAddress = CfOpInstall.cfAddress(
			ctx,
			multisig,
			app.signingKeys,
			app.uniqueId, // figure out actual type here
			TIMEOUT
		);
		return new Address(ctx["RegistryAddress"], cfAddress);
	}

	private static cfAddress(
		ctx: NetworkContext,
		multisig: string,
		appKeys: Array<string>,
		uniqueId: number,
		timeout: number
	): string {
		// FIXME: the abi and bytecode are placeholders here
		const initcode = new ethers.Interface(
			ProxyContract.abi
		).deployFunction.encode(ProxyContract.bytecode, [zeroAddress]);

		// FIXME: need to get call data to contract to ensure unique hash
		//const calldata = new ethers.Interface([
		//	"instantiate(address,address[],address,uint256,uint256)"
		//]).functions.instantiate(
		//	multisig,
		//	appKeys,
		//	ctx["RegistryAddress"],
		//	uniqueId,
		//	timeout
		//).data;
		const calldata = zeroAddress; // arbitrary string

		return ethers.utils.solidityKeccak256(
			["bytes1", "bytes", "bytes32"],
			["0x19", initcode, ethers.utils.solidityKeccak256(["bytes"], [calldata])]
		);
	}

	private static nonceCondition(
		ctx: NetworkContext,
		multisig: string,
		channelKeys: Array<string>,
		appCfAddr: string
	): Condition {
		let nonceUniqueId = Number(
			ethers.utils.solidityKeccak256(["bytes32"], [appCfAddr])
		);
		let nonceCfAddr = CfOpInstall.cfAddress(
			ctx,
			multisig,
			channelKeys,
			nonceUniqueId,
			TIMEOUT
		);

		return new Condition(
			new Function(
				new Address(ctx["RegistryAddress"], nonceCfAddr),
				GET_STATE_SIGHASH
			),
			"0x",
			ethers.utils.defaultAbiCoder.encode(["uint256"], [1])
		);
	}

	private static pipeline(
		ctx: NetworkContext,
		app: CfApp,
		appCfAddr: string
	): Array<Function> {
		return [
			new Function(
				new Address(ctx["RegistryAddress"], appCfAddr),
				app.interpreterSigHash
			)
		];
	}

	private static payoutFn(ctx: NetworkContext): Function {
		return new Function(
			new Address(zeroAddress, ctx["AssetDispatcherAddress"]),
			ctx["AssetDispatcherSighashForETH"]
		);
	}
}
