import {
	NetworkContext,
	StateChannelInfos,
	AppChannelInfos,
	ChannelStates,
	OpCodeResult,
	AppChannelInfo,
	StateChannelInfo,
	Address,
	H256
} from "./types";
import { CfFreeBalance } from "./middleware/cf-operation/types";
import { CounterfactualVM } from "./vm";

// TODO: Cleanup
const networkInfo = require("../../contracts/networks/7777777.json");

export class CfState {
	channelStates: ChannelStates;
	networkContext: NetworkContext;
	constructor(channelStates: ChannelStates, network?: NetworkContext) {
		this.channelStates = channelStates;
		if (network === undefined) {
			this.networkContext = this.defaultNetwork();
		} else {
			this.networkContext = network;
		}
	}

	private defaultNetwork(): NetworkContext {
		return new NetworkContext(
			// todo
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd0",
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd1",
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd2",
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd3",
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd5",
			"0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd6"
		);
	}

	stateChannel(multisig: Address): StateChannelInfo {
		return this.channelStates[multisig];
	}

	stateChannelFromAddress(toAddress: Address): StateChannelInfo {
		let multisig = Object.keys(this.channelStates).find(multisig => {
			return this.channelStates[multisig].me === toAddress;
		});

		if (multisig) {
			return this.channelStates[multisig];
		} else {
			throw Error(`Could not find multisig for address ${toAddress}`);
		}
	}

	stateChannelFromMultisigAddress(multisigAddress: Address): StateChannelInfo {
		let multisig = this.channelStates[multisigAddress];
		if (multisig) {
			return this.channelStates[multisigAddress];
		} else {
			throw Error(`Could not find multisig of address ${multisigAddress}`);
		}
	}

	app(multisig: Address, cfAddr: H256): AppChannelInfo {
		return this.channelStates[multisig].appChannels[cfAddr];
	}

	freeBalanceFromAddress(toAddress: Address): CfFreeBalance {
		return this.stateChannelFromAddress(toAddress).freeBalance;
	}

	freeBalanceFromMultisigAddress(multisigAddress: Address): CfFreeBalance {
		let multisig = this.channelStates[multisigAddress];
		if (multisig) {
			return this.channelStates[multisigAddress].freeBalance;
		} else {
			throw Error(`Could not find multisig of address ${multisigAddress}`);
		}
	}

	/**
	 * @returns a deep copy of the StateChannelInfos.
	 */
	stateChannelInfosCopy(): StateChannelInfos {
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
		readonly counterParty: Address,
		readonly me: Address,
		readonly multisigAddress: Address,
		readonly appChannels: AppChannelInfos = {},
		readonly freeBalance: CfFreeBalance
	) {}

	/**
	 * @returns the toAddress, fromAddress in alphabetical order.
	 */
	owners(): string[] {
		return [this.counterParty, this.me].sort((a, b) => (a < b ? -1 : 1));
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
	instructionPointer: number = Object.create(null);
	vm: CounterfactualVM = Object.create(null);
}
