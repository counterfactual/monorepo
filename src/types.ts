import * as ethers from "ethers";
import { Response } from "./vm";
import { CfAppInterface, Terms } from "./middleware/cf-operation/types";
import { Instruction } from "./instructions";
import { CfNonce } from "./middleware/cf-operation/types";

/**
 * Aliases to help code readability. Should think about actually changing these
 * to be non strings.
 */
export type Bytes = string;
export type Bytes4 = string;
export type Bytes32 = string;
export type Address = string;
export type H256 = string;

export interface ClientMessage {
	requestId: string;
	appName?: string;
	appId: string;
	action: string;
	data: any;
	multisigAddress: string;
	toAddress: string;
	fromAddress: string;
	// we should remove this from this object
	stateChannel?: StateChannelInfo;
	seq: number;
}

export interface InstallData {
	peerA: PeerBalance;
	peerB: PeerBalance;
	keyA: Address;
	keyB: Address;
	encodedAppState: Bytes;
	terms: Terms;
	app: CfAppInterface;
	timeout: number;
}

export interface UpdateData {
	encodedAppState: string;
	/**
	 * Hash of the State struct specific to a given applicatioin.
	 */
	appStateHash: string;
}

// todo: remove in favor of CfNonce
export class FreeBalance {
	constructor(
		readonly peerA: PeerBalance,
		readonly peerB: PeerBalance,
		readonly localNonce: number,
		readonly uniqueId: number,
		readonly timeout: number,
		readonly nonce: CfNonce
	) {}
}

/**
 * peerA is always the address first in alphabetical order.
 */
export class CanonicalPeerBalance {
	constructor(readonly peerA: PeerBalance, readonly peerB: PeerBalance) {}
	static canonicalize(
		peer1: PeerBalance,
		peer2: PeerBalance
	): CanonicalPeerBalance {
		if (peer2.address.localeCompare(peer1.address) < 0) {
			return new CanonicalPeerBalance(peer2, peer1);
		}
		return new CanonicalPeerBalance(peer1, peer2);
	}
}

export class PeerBalance {
	constructor(readonly address: Address, readonly balance: number) {}

	/**
	 * Returnsan array of peer balance objects sorted by address ascendi.
	 */
	static balances(
		address1: Address,
		balance1: number,
		address2: Address,
		balance2: number
	): CanonicalPeerBalance {
		if (address2.localeCompare(address1) < 0) {
			return new CanonicalPeerBalance(
				new PeerBalance(address2, balance2),
				new PeerBalance(address1, balance1)
			);
		}
		return new CanonicalPeerBalance(
			new PeerBalance(address1, balance1),
			new PeerBalance(address2, balance2)
		);
	}

	static add(bals: PeerBalance[], inc: PeerBalance[]): PeerBalance[] {
		return [
			new PeerBalance(bals[0].address, bals[0].balance + inc[0].balance),
			new PeerBalance(bals[1].address, bals[1].balance + inc[1].balance)
		];
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
		readonly Registry: Address,
		readonly PaymentAppAddress: Address,
		readonly ConditionalTransfer: Address,
		readonly MultiSend: Address,
		readonly NonceRegistry: Address
	) {}
}

// Tree of all the stateChannel and appChannel state
export interface ChannelStates {
	[s: string]: StateChannelInfo;
}

export interface StateChannelInfo {
	toAddress: Address;
	fromAddress: Address;
	multisigAddress: Address;
	appChannels: AppChannelInfos;
	freeBalance: FreeBalance;

	// TODO Move this out of the datastructure
	/**
	 * @returns the addresses of the owners of this state channel sorted
	 *          in alphabetical order.
	 */
	owners(): string[];
}

export interface AppChannelInfo {
	// cf address
	id: H256;
	// used to generate cf address
	uniqueId: number;
	peerA: PeerBalance;
	peerB: PeerBalance;
	// ephemeral keys
	keyA: Address;
	keyB: Address;
	encodedState: any;
	appState?: any;
	appStateHash?: H256;
	localNonce: number;
	timeout: number;
	terms: Terms;
	cfApp: CfAppInterface;
	dependencyNonce: CfNonce;

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
	opCode: Instruction;
	value: any;
}

export interface ResponseSink {
	sendResponse(res: Response);
}

export class CfPeerAmount {
	constructor(readonly addr: string, public amount: number) {}
}

export class Signature {
	// todo: fix types
	constructor(readonly v: number, readonly r: string, readonly s: string) {}

	toString(): string {
		return (
			"0x" +
			this.r.substr(2) +
			this.s.substr(2) +
			ethers.utils.hexlify(this.v).substr(2)
		);
	}

	static matches(hash: string, signature: Signature, address: string): boolean {
		// FIXME: Use real signatures in tests
		return true;
	}

	static toBytes(sigs: Signature[]): Bytes {
		let bytes = "0x";
		sigs.forEach(sig => {
			bytes += sig.r.substr(2) + sig.s.substr(2) + sig.v;
		});
		return bytes;
	}
}
