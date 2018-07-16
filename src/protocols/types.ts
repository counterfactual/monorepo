import * as ethers from "ethers";
import { Transaction } from "./cf-operation/types";
import { ChannelMsg } from "./channel-msg";
import { CfProtocol } from "./protocol";
import { CfAppUninstallRequest } from "client/cf-app-store";

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

export abstract class MultisigProvider {
	public abstract getAddress(): string;
	public owners: Array<string>;
	/**
	 * Broadcasts an onchain transaction, creating a multisig with
	 * owners set as the given addresses.
	 *
	 * TODO: Fix types to be addresses, not any.
	 */
	abstract async createMultisig(owners: Array<any>): Promise<string>;

	/**
	 * @returns the amount of funds controlled by the multisig on chain.
	 */
	abstract async balance(multisigAddr: string): Promise<number>;

	// TODO: Decide if these are the right names for these methods.
	public abstract getMyAddress(): string;
	public abstract getPeerAddress(): string;
}

export abstract class SignerService {
	public address: string;
	public privateKey: string;
	// TODO: Decide if these are the right names for these methods.
	public abstract async sign(hash: string, data: Object): Promise<Signature>;
	public abstract async signMany(
		hashList: Array<string>,
		data: Object
	): Promise<Array<Signature>>;
}

export abstract class SenderService {
	constructor(
		readonly signer: SignerService,
		readonly provider: BlockchainProvider
	) {}
	abstract async sendTransaction(tx: string): Promise<string>;
}

export abstract class BlockchainProvider {
	constructor(readonly provider: any) {}
}

export abstract class AppSigner {
	abstract peerKey: string;
	abstract async signPeerUpdate(
		dataToSign: string,
		data: any
	): Promise<Signature>;
	abstract async signMyUpdate(dataToSign: string);
	abstract async shouldUninstall(req: CfAppUninstallRequest): Promise<boolean>;
	/**
	 * The key used to sign app updates.
	 */
	abstract async getSigningKey(): Promise<string>;
}

export abstract class ProtocolStoreProvider {
	// This store can be backed by multiple external store providers
	// for extra redundancy.
	abstract makeStore(
		protocolStoreProviders?: Array<ProtocolStoreProvider>
	): ProtocolStore;
}

/**
 * This store is responsible for storing protocol messages
 * sent/received by a State Channel Client.
 */
export interface ProtocolStore {
	/**
	 * By default if no seq number is specified and the specified protocol is
	 * mid-execution, its last message is returned.
	 */
	// TODO: protocolId should not be CfProtocol, multiple installations could be
	// happening in the channel
	getMsg(
		channelId: string,
		protocolId: string,
		seqNo?: number
	): Promise<ChannelMsg>;

	// Used by the protocol object to send the AP the msg.
	// This will be the primary method being called on the store.
	putMsg(channelId: string, protocolId: string, channelMsg: ChannelMsg);

	// Returns the total number of messages in the store
	msgCount(channelId: string, protocolId: string): number;
	close(endMsg?: ChannelMsg);
	isClosed(): boolean;
}

export abstract class ChannelMsgIo {
	abstract send(msg: ChannelMsg);
	abstract async receive(): Promise<ChannelMsg>;
}
// replace with something else?
export enum AppId {
	BalanceRefund,
	FreeBalance,
	Nonce
}
