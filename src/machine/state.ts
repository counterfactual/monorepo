import {
	StateChannelInfos,
	AppChannelInfos,
	ChannelStates,
	OpCodeResult,
	AppChannelInfo,
	StateChannelInfo,
	FreeBalance,
	PeerBalance
} from "./types";

export class StateChannelInfoImpl implements StateChannelInfo {
	constructor(
		readonly toAddress?: string,
		readonly fromAddress?: string,
		readonly multisigAddress?: string,
		readonly appChannels?: AppChannelInfos,
		readonly freeBalance?: FreeBalance
	) {
		if (!appChannels) {
			this.appChannels = {};
		}
		if (!freeBalance) {
			let owners = this.owners();
			let peerBalA = new PeerBalance(owners[0], 0);
			let peerBalB = new PeerBalance(owners[1], 0);
			this.freeBalance = new FreeBalance(peerBalA, peerBalB);
		}
	}

	/**
	 * @returns the toAddress, fromAddress in alphabetical order.
	 */
	owners(): string[] {
		return [this.toAddress, this.fromAddress].sort((a, b) => (a < b ? -1 : 1));
	}
}

export class AppChannelInfoImpl {
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

export class Context {
	results: OpCodeResult[];
	stateChannelInfos: StateChannelInfos;
	appChannelInfos: AppChannelInfos;
	instructionPointer: number;
}
