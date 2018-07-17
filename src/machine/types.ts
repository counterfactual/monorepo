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
