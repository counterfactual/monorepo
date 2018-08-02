import {
	NetworkContext,
	StateChannelInfos,
	AppChannelInfos,
	ChannelStates,
	OpCodeResult,
	AppChannelInfo,
	StateChannelInfo,
	FreeBalance,
	PeerBalance,
	Address,
	H256
} from "./types";
import { CounterfactualVM } from "./vm";

export class CfState {
	channelStates: ChannelStates;
	networkContext: NetworkContext;
	constructor(channelStates: ChannelStates) {
		this.channelStates = channelStates;
		this.networkContext = new NetworkContext(
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd0",
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd1",
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd2",
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd3",
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4"
		);
	}

	stateChannel(multisig: Address): StateChannelInfo {
		return this.channelStates[multisig];
	}

	app(multisig: Address, cfAddr: H256): AppChannelInfo {
		return this.channelStates[multisig].appChannels[cfAddr];
	}

	freeBalance(multisig: Address): FreeBalance {
		return this.channelStates[multisig].freeBalance;
	}

	/**
	 * @returns a deep copy of the StateChannelInfos.
	 */
	stateChannelInfos(): StateChannelInfos {
		return JSON.parse(JSON.stringify(this.channelStates));
	}

	appChannelInfos(): AppChannelInfos {
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
		readonly toAddress: string,
		readonly fromAddress: string,
		readonly multisigAddress: string,
		readonly appChannels: AppChannelInfos = {},
		readonly freeBalance: FreeBalance
	) {}

	/**
	 * @returns the toAddress, fromAddress in alphabetical order.
	 */
	owners(): string[] {
		return [this.toAddress, this.fromAddress].sort((a, b) => (a < b ? -1 : 1));
	}
}

export class AppChannelInfoImpl {
	id?: H256;
	amount?: any;
	toSigningKey?: Address;
	fromSigningKey?: Address;
	stateChannel?: StateChannelInfo;
	rootNonce?: number;

	encodedState?: any;
	appStateHash?: H256;
	appState?: any;
	localNonce?: number;
}

export class Context {
	results: OpCodeResult[] = Object.create(null);
	stateChannelInfos: StateChannelInfos = Object.create(null);
	appChannelInfos: AppChannelInfos = Object.create(null);
	instructionPointer: number = Object.create(null);
	vm: CounterfactualVM = Object.create(null);
}
