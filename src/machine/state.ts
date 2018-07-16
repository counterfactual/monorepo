
import {
	IoMessage,
	StateChannelInfos,
	AppChannelInfos,
	CfState,
	OpCodeResult,
	ResponseSink,
	AppChannelInfo,
	StateChannelInfo,
	ClientMessage,
	FreeBalance
} from "./types";

export class StateChannelInfoImpl implements StateChannelInfo {
	toAddress?: string;
	fromAddress?: string;
	multisigAddress?: string;
	appChannels?: AppChannelInfos;
	freeBalance?: FreeBalance;

	constructor() {
		this.toAddress = 'toAddress';
		this.fromAddress = 'fromAddress';
		this.multisigAddress = 'sampleMultisig';
		this.appChannels = {};
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