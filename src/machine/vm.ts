import { ActionExecution, Action } from './action';
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
(Symbol as any).asyncIterator = Symbol.asyncIterator || Symbol.for("Symbol.asyncIterator");

import { AppChannelInfoImpl, StateChannelInfoImpl, Context } from "./state";
export let Instructions = {
	update: [['generateOp', 'update'], ['signMyUpdate'], ['IoSendMessage'], ['waitForIo'], ['validateSignatures'], ['returnSuccess']],
	updateAck: [['waitForIo'], ['generateOp'], ['validateSignatures'], ['signMyUpdate'], ['IoSendMessage'], ['returnSuccess']],
	setup: [['generateOp', 'updateAsOwn'], ['signMyUpdate'], ['generateOp', 'install'], ['signMyUpdate'], ['IoSendMessage'], ['waitForIo'], ['validateSignatures'], ['returnSuccess']],
};

/*
readonly appId: string,
readonly signingKey: string,
readonly peerAmounts: Array<CfPeerAmount>,
readonly initData: any,
readonly metadata?: any
*/
/*
let Instructions = {
	update: ['generateOp', 'signMyUpdate', 'validate', 'IoSendMessage', 'waitForAllSignatures', 'validate', 'returnSuccess'],
}
*/

export class Response {
	requestId: string;
	status: string;
	error: string;

	constructor(id: string, status: string) {
		this.requestId = id;
		this.status = status;
	}
}

export class InternalMessage {
	actionName: string;
	opCode: string;
	opCodeArgs: string[];
	clientMessage: ClientMessage;

	constructor(action: string, [opCode, ...opCodeArgs]: string[],  clientMessage: ClientMessage) {
		this.actionName = action;
		this.opCode = opCode;
		this.opCodeArgs = opCodeArgs;
		this.clientMessage = clientMessage;
	}
}

export class CounterfactualVM {
	requests: any;
	middlewares: { method: Function, scope: string }[];
	stateChannelInfos: StateChannelInfos;
	appChannelInfos: AppChannelInfos;
	wallet: ResponseSink;
	cfState: CfState;

	constructor(wallet: ResponseSink) {
		this.requests = {};
		this.middlewares = [];
		this.stateChannelInfos = Object.create(null);
		let stateChannel = new StateChannelInfoImpl();
		this.wallet = wallet;
		this.stateChannelInfos.sampleMultisig = stateChannel;

		this.appChannelInfos = Object.create(null);
		let appChannel = new AppChannelInfoImpl();
		appChannel.id = 'someAppId';
		appChannel.stateChannel = stateChannel;
		stateChannel.appChannels.someAppId = appChannel;
		this.appChannelInfos.someAppId = appChannel;

		this.cfState = this.stateChannelInfos;
	}

	setupDefaultMiddlewares() {
		this.register('returnSuccess', async (message: InternalMessage, next: Function, context: Context) => {
			
			let appChannel = context.appChannelInfos[message.clientMessage.appId];

			// TODO add nonce and encoded app state
			let updatedAppChannel: AppChannelInfo = {
				appState: message.clientMessage.data.appState
			}

			let updatedStateChannel: StateChannelInfo = {
				appChannels: {
					[appChannel.id]: updatedAppChannel
				}
			}

			let result: CfState = {
				[appChannel.stateChannel.multisigAddress]: updatedStateChannel
			}

			return result;
		});
	}

	validateMessage(msg: ClientMessage) {
		return true;
	}

	receive(msg: ClientMessage) {
		this.validateMessage(msg);
		let request = new Action(msg.requestId, msg.action, msg);
		this.requests[request.requestId] = request;
		let response = new Response(request.requestId, 'started');
		this.sendResponse(response);
		this.processRequest(request);
	}

	sendResponse(res: Response) {
		this.wallet.sendResponse(res);
	}

	async processRequest(action: Action) {
		let val;
		// TODO deal with errors
		for await (val of action.execute(this)) {
			console.log('processed a step');
		}

		this.mutateState(val);
		// write to the state object
	}

	mutateState(state: CfState) {
		console.log('about to update -------');
		console.log('existing state ', this.cfState);
		console.log('new state ', state);
		Object.assign(this.cfState, state);
		console.log('updated state after updating ', this.cfState);
	}

	register(scope: string, method: Function) {
		this.middlewares.push({ scope, method });
	}
}
