import { Response } from "./vm";

export interface ClientMessage {
	requestId: string;
	appName: string;
	appId: string;
	action: string;
	data: any;
}

export class FreeBalance {

}

export interface CfState {
	[s: string]: StateChannelInfo
}

export interface StateChannelInfo {
	toAddress?: string;
	fromAddress?: string;
	multisigAddress?: string;
	appChannels?: AppChannelInfos;
	freeBalance?: FreeBalance;
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

export interface StateChannelInfos { [s: string]: StateChannelInfo }
export interface AppChannelInfos { [s: string]: AppChannelInfo }

export interface OpCodeResult { opCode: string, value: any };

export interface ResponseSink {
	sendResponse(res: Response)
}

export interface IoMessage {
	appId: string;
	multisig: string;
};

