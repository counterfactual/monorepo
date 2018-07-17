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
}

export class FreeBalance {}

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

	/**
	 * @returns the addresses of the owners of this state channel sorted
	 *          in alphabetical order.
	 */
	owners(): string[];
}

export interface AppChannelInfo {
	id?: string;
	amount?: any;
	toSigningKey?: string;
	fromSigningKey?: string;
	stateChannel?: StateChannelInfo;
	rootNonce?: number;

	encodedState?: any;
	appState?: any;
	localNonce?: number;
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

export interface IoMessage {
	appId: string;
	multisig: string;
}

export class CfPeerAmount {
	constructor(readonly addr: string, public amount: number) {}
}

export class CfApp {
	constructor(
		readonly bytecode: string,
		readonly stateType: string,
		readonly signingKeys: Array<string>,
		readonly peerAmounts: Array<CfPeerAmount>,
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
