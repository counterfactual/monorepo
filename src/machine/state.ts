
import {
	IoMessage,
	StateChannelInfos,
	AppChannelInfos,
	ChannelStates,
	OpCodeResult,
	ResponseSink,
	AppChannelInfo,
	StateChannelInfo,
	ClientMessage,
	FreeBalance
} from "./types";


export class StateChannelInfoImpl implements StateChannelInfo {
  appChannels?: AppChannelInfos;
  freeBalance?: FreeBalance;
	constructor(
    readonly toAddress?: string,
    readonly fromAddress?: string,
    readonly multisigAddress?: string
  ) {
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