import {
	NetworkContext,
	StateChannelInfos,
	AppChannelInfos,
	ChannelStates,
	OpCodeResult,
	AppChannelInfo,
	StateChannelInfo,
	FreeBalance,
	PeerBalance
} from "./types";

export class CfState {
	channelStates: ChannelStates;
	networkContext: NetworkContext;
	constructor(channelStates: ChannelStates) {
		this.channelStates = channelStates;
		// TODO Refactor params to be an an object with prop names
		this.networkContext = new NetworkContext(
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			"9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			"0xaaaabbbb",
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			"0xbbbbaaaa",
			"0x0"
		);
	}

	stateChannel(multisig: string): StateChannelInfo {
		return this.channelStates[multisig];
	}

	app(multisig: string, cfAddr: string): AppChannelInfo {
		return this.channelStates[multisig].appChannels[cfAddr];
	}

	freeBalance(multisig: string): FreeBalance {
		return this.channelStates[multisig].freeBalance;
	}

	get stateChannelInfos(): StateChannelInfos {
		let infos = {};
		for (let channel of Object.keys(this.channelStates)) {
			infos[channel] = this.channelStates[channel];
		}
		return infos;
	}

	get appChannelInfos(): AppChannelInfos {
		let infos = {};
		for (let channel of Object.keys(this.channelStates)) {
			for (let appChannel of Object.keys(
				this.channelStates[channel].appChannels
			)) {
				infos[appChannel] = this.channelStates[channel].appChannels[appChannel];
			}
		}
		return infos;
	}
}

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
