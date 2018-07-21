import * as ethers from "ethers";
import {
	NetworkContext,
	PeerBalance,
	FreeBalance,
	AppChannelInfo,
	CanonicalPeerBalance
} from "../types";
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

export class CfOpUninstall {
	static operation(
		ctx: NetworkContext,
		multisig: string,
		freeBalance: FreeBalance,
		app: AppChannelInfo,
		peerAmounts: PeerBalance[]
	): CfOperation {
		let canon = CanonicalPeerBalance.canonicalize(
			peerAmounts[0],
			peerAmounts[1]
		);
		let owners = [canon.peerA.address, canon.peerB.address];
		let updateFreeBalance = CfOpUninstall.updateFreeBalance(
			ctx,
			multisig,
			freeBalance,
			peerAmounts,
			owners
		);
		let bumpNonce = CfOpUninstall.updateNonce(ctx, multisig, owners, app);

		let ops = [updateFreeBalance, bumpNonce];
		//let ops = [bumpNonce];
		return new CFMultiOp(ops, multisig);
	}

	private static updateNonce(
		ctx: NetworkContext,
		multisig: string,
		owners: string[],
		app: AppChannelInfo
	): CfAppUpdateAsOwner {
		// todo: put dependency nonce on app objet and pass in
		//       once new conract updates are incorporated
		let uniqueId = 10;
		const nonceCfAddress = CfOpUninstall.cfAddress(
			ctx,
			multisig,
			owners,
			uniqueId,
			TIMEOUT
		);

		let newNonce = app.rootNonce + 1;
		const nonceState = ethers.utils.AbiCoder.defaultCoder.encode(
			["uint256"],
			[newNonce]
		);
		return new CfAppUpdateAsOwner(
			multisig,
			nonceCfAddress,
			nonceState,
			newNonce
		);
	}

	private static updateFreeBalance(
		ctx: NetworkContext,
		multisig: string,
		freeBalance: FreeBalance,
		peerBalances: Array<PeerBalance>,
		owners: Array<string>
	): CfAppUpdateAsOwner {
		const freeBalanceCfAddress = CfOpUninstall.cfAddress(
			ctx,
			multisig,
			owners,
			freeBalance.uniqueId,
			TIMEOUT
		);
		const newBals = PeerBalance.add(
			[freeBalance.peerA, freeBalance.peerB],
			peerBalances
		);
		const freeBalanceState = ethers.utils.AbiCoder.defaultCoder.encode(
			["tuple(tuple(address,bytes32),uint256)[]"],
			[
				[
					[
						[
							zeroAddress,
							ethers.utils.AbiCoder.defaultCoder.encode(
								["bytes32"],
								[newBals[0].address]
							)
						],
						newBals[0].balance.toString()
					],
					[
						[
							zeroAddress,
							ethers.utils.AbiCoder.defaultCoder.encode(
								["bytes32"],
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

	// TODO: Generalize for all cf ops
	private static cfAddress(
		ctx: NetworkContext,
		multisig: string,
		signingKeys: Array<string>,
		uniqueId: number,
		timeout: number
	): string {
		const initcode = ethers.Contract.getDeployTransaction(
			ProxyContract.bytecode,
			ProxyContract.abi,
			ctx["CounterfactualAppAddress"]
		).data;

		const calldata = new ethers.Interface([
			"instantiate(address,address[],address,uint256,uint256)"
		]).functions.instantiate(
			multisig,
			signingKeys,
			ctx["RegistryAddress"],
			uniqueId,
			timeout
		).data;

		return ethers.utils.solidityKeccak256(
			["bytes1", "bytes", "bytes32"],
			["0x19", initcode, ethers.utils.solidityKeccak256(["bytes"], [calldata])]
		);
	}
}
