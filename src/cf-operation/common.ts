import * as ethers from "ethers";
import { NetworkContext, Bytes, Address } from "../types";
import { CfApp, Abi, Terms, zeroBytes32, zeroAddress } from "./types";
import { PaymentApp } from "./contracts/paymentApp";
import { StateChannel } from "./contracts/stateChannel";

export function appCfAddress(
	ctx: NetworkContext,
	multisig: string,
	signingKeys: string[],
	timeout: number,
	appUniqueId: number,
	terms: Terms,
	app: CfApp
): string {
	/*
	 * constructor(
	 *   address owner,
	 *   address[] signingKeys,
	 *   bytes32 app,
	 *   bytes32 terms,
	 *   uint256 timeout
	 * )
	 */
	// @ts-ignore
	/*
	let initcode = ethers.Contract.getDeployTransaction(
		StateChannel.bytecode,
		StateChannel.abi,
		multisig,
		signingKeys,
		app.hash(),
		terms.hash(),
		timeout
	).data;
	*/
	// todo: why is the bytecode for StateChannel breaking ethers?
	let initcode =
		"0x60806040523480156200001157600080fd5b5060405162003621380380620036";
	return cfAddr(initcode, appUniqueId);
}

function cfAddr(initcode: string, salt: number) {
	return ethers.utils.solidityKeccak256(
		["bytes1", "bytes", "uint256"],
		["0x19", initcode, salt]
	);
}

export function freeBalance(ctx: NetworkContext): [Terms, CfApp] {
	let address = ctx.PaymentAppAddress;
	let reducer = "0x00000000"; // not used
	let resolver = new ethers.Interface(PaymentApp.abi).functions.resolver
		.sighash;
	let turnTaker = "0x00000000"; // not used
	let isStateFinal = "0x00000000"; // not used
	return [
		new Terms(0, 0, zeroAddress),
		new CfApp(address, reducer, resolver, turnTaker, isStateFinal)
	];
}

export function freeBalanceData(
	ctx: NetworkContext,
	multisig: Address,
	signingKeys: Address[],
	timeout: number,
	freeBalanceUniqueId: number,
	alice: Address,
	aliceFreeBalance: number,
	bob: Address,
	bobFreeBalance: number,
	freeBalanceLocalNonce: number
): Bytes {
	let [terms, app] = freeBalance(ctx);
	let freeBalanceCfAddr = appCfAddress(
		ctx,
		multisig,
		signingKeys,
		timeout,
		freeBalanceUniqueId,
		terms,
		app
	);
	let appStateHash = ethers.utils.solidityKeccak256(
		["bytes1", "address", "address", "uint256", "uint256"],
		["0x19", alice, bob, aliceFreeBalance, bobFreeBalance]
	);
	// don't need signatures since the multisig is the owner
	let signatures = "0x0";
	return proxyCallSetStateData(
		appStateHash,
		freeBalanceCfAddr,
		freeBalanceLocalNonce,
		timeout,
		signatures,
		ctx.Registry
	);
}

export function proxyCallSetStateData(
	appStateHash: string,
	appCfAddr: string,
	appLocalNonce: number,
	timeout: number,
	signatures: Bytes,
	registry: Address
) {
	// @ts-ignore
	return new ethers.Interface([Abi.proxyCall]).functions.proxyCall.encode([
		registry,
		appCfAddr,
		new ethers.Interface([Abi.setState]).functions.setState.encode([
			appStateHash,
			appLocalNonce,
			timeout,
			signatures
		])
	]);
}
