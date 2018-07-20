import * as ethers from "ethers";
import { Response } from "./vm";

export interface ClientMessage {
	requestId: string;
	appName?: string;
	appId?: string;
	action: string;
	data: any;
	multisigAddress?: string;
	toAddress?: string;
	fromAddress?: string;
	stateChannel: StateChannelInfo;
	seq: number;
}

export interface InstallData {
	peerA: PeerBalance;
	peerB: PeerBalance;
	keyA: string;
	keyB: string;
	encodedAppState: string;
}

export class FreeBalance {
	constructor(
		readonly peerA: PeerBalance,
		readonly peerB: PeerBalance,
		readonly localNonce: number,
		readonly uniqueId: number
	) {}
}

/**
 * peerA is always the address first in alphabetical order.
 */
export interface CanonicalPeerBalance {
	peerA: PeerBalance;
	peerB: PeerBalance;
}

export class PeerBalance {
	constructor(readonly address: string, readonly balance: number) {}

	/**
	 * Returnsan array of peer balance objects sorted by address ascendi.
	 */
	static balances(
		address1: string,
		balance1: number,
		address2: string,
		balance2: number
	): CanonicalPeerBalance {
		if (address2.localeCompare(address1) < 0) {
			return {
				peerA: new PeerBalance(address2, balance2),
				peerB: new PeerBalance(address1, balance1)
			};
		}
		return {
			peerA: new PeerBalance(address1, balance1),
			peerB: new PeerBalance(address2, balance2)
		};
	}

	/**
	 * @assume each array is of length 2.
	 */
	static subtract(
		oldBals: PeerBalance[],
		newBals: PeerBalance[]
	): PeerBalance[] {
		if (oldBals[0].address === newBals[0].address) {
			return [
				new PeerBalance(
					oldBals[0].address,
					oldBals[0].balance - newBals[0].balance
				),
				new PeerBalance(
					oldBals[1].address,
					oldBals[1].balance - newBals[1].balance
				)
			];
		} else {
			return [
				new PeerBalance(
					oldBals[0].address,
					oldBals[0].balance - newBals[1].balance
				),
				new PeerBalance(
					oldBals[1].address,
					oldBals[1].balance - newBals[0].balance
				)
			];
		}
	}
}

export class NetworkContext {
	constructor(
		readonly CounterfactualAppAddress: string,
		readonly RegistryAddress: string,
		readonly WithdrawAppInterpreterAddress: string,
		readonly WithdrawAppInterpreterSighash: string,
		readonly AssetDispatcherAddress: string,
		readonly AssetDispatcherSighashForETH: string,
		readonly WithdrawAppBytecode: string
	) {}
}

// Tree of all the stateChannel and appChannel state
export interface ChannelStates {
	[s: string]: StateChannelInfo;
}

export interface StateChannelInfo {
	toAddress?: string;
	fromAddress?: string;
	multisigAddress?: string;
	appChannels?: AppChannelInfos;
	freeBalance?: FreeBalance;

	// TODO Move this out of the datastructure
	/**
	 * @returns the addresses of the owners of this state channel sorted
	 *          in alphabetical order.
	 */
	owners(): string[];
}

export interface AppChannelInfo {
	id: string;
	peerA: PeerBalance;
	peerB: PeerBalance;
	// ephemeral keys
	keyA: string;
	keyB: string;
	// count of the dependency nonce in my condition
	rootNonce: number;
	encodedState: any;
	appState?: any;
	localNonce: number;

	//TODO move this into a method that is outside the data structure
	stateChannel?: StateChannelInfo;
}

export interface StateChannelInfos {
	[s: string]: StateChannelInfo;
}
export interface AppChannelInfos {
	[s: string]: AppChannelInfo;
}

export interface OpCodeResult {
	opCode: string;
	value: any;
}

export interface ResponseSink {
	sendResponse(res: Response);
}

export class CfPeerAmount {
	constructor(readonly addr: string, public amount: number) {}
}

export class CfApp {
	constructor(
		readonly bytecode: string,
		readonly stateType: string,
		readonly signingKeys: Array<string>,
		readonly peerAmounts: Array<PeerBalance>,
		readonly initData: any,
		readonly interpreterSigHash: string,
		readonly uniqueId: number
	) {}
}

export class Signature {
	// todo: fix types
	constructor(readonly v: Number, readonly r: string, readonly s: string) {}

	public toString(): string {
		return (
			"0x" +
			this.r.substr(2) +
			this.s.substr(2) +
			ethers.utils.hexlify(this.v).substr(2)
		);
	}

	public static matches(
		hash: string,
		signature: Signature,
		address: string
	): boolean {
		// FIXME: Use real signatures in tests
		return true;
		/*
		const recoveredAddress = ethers.Wallet.verifyMessage(
			hash,
			signature.toString()
		);
		return recoveredAddress === address;
		*/
	}

	public static toVRSObject(signatures: Array<Signature>): any {
		return {
			v: signatures.map(x => x.v),
			r: signatures.map(x => x.r),
			s: signatures.map(x => x.s)
		};
	}
}
