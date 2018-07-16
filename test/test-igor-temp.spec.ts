import { CfOpUpdate } from "../src/protocols/cf-operation/cf-op-update";
import { RSA_SSLV23_PADDING } from "constants";

interface ClientMessage {
	requestId: string;
	appName: string;
	appId: string;
	action: string;
	data: any;
}

let Instructions = {
	update: ['generateOp', 'signMyUpdate', 'IoSendMessage', 'waitForIo', 'validateSignatures', 'returnSuccess'],
	updateAck: ['waitForIo', 'generateOp', 'validateSignatures', 'signMyUpdate', 'IoSendMessage', 'returnSuccess']
}

/*
let Instructions = {
	update: ['generateOp', 'signMyUpdate', 'validate', 'IoSendMessage', 'waitForAllSignatures', 'validate', 'returnSuccess'],
}
*/

class Response {
	requestId: string;
	status: string;
	error: string;

	constructor(id: string, status: string) {
		this.requestId = id;
		this.status = status;
	}
}

(Symbol as any).asyncIterator = Symbol.asyncIterator || Symbol.for("Symbol.asyncIterator");

class Action {
	name: string;
	requestId: string;
	clientMessage: ClientMessage;
	execution: ActionExecution;
	instructions: string[];

	constructor(id: string, action: string, clientMessage: ClientMessage) {
		this.requestId = id;
		this.clientMessage = clientMessage;
		this.name = action;
		this.instructions = Instructions[action];
	}

	execute(wallet: CounterfactualVM): ActionExecution {
		let exe = new ActionExecution(this, 0, this.clientMessage, wallet);
		this.execution = exe;
		return exe;
	}
}

class InternalMessage {
	actionName: string;
	opCode: string;
	clientMessage: ClientMessage;

	constructor(action: string, opCode: string, clientMessage: ClientMessage) {
		this.actionName = action;
		this.opCode = opCode;
		this.clientMessage = clientMessage;
	}
}

class FreeBalance {

}

interface CfState {
	[s: string]: StateChannelInfo
}

interface StateChannelInfo {
	toAddress?: string;
	fromAddress?: string;
	multisigAddress?: string;
	appChannels?: AppChannelInfos;
	freeBalance?: FreeBalance;
}

class StateChannelInfoImpl implements StateChannelInfo {
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

interface AppChannelInfo {
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

class AppChannelInfoImpl {
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
interface StateChannelInfos { [s: string]: StateChannelInfo }
interface AppChannelInfos { [s: string]: AppChannelInfo }

interface OpCodeResult { opCode: string, value: any };
class Context {
	results: OpCodeResult[];
	stateChannelInfos: StateChannelInfos;
	appChannelInfos: AppChannelInfos;
	instructionPointer: number;
}

class ActionExecution {

	action: Action;
	instructionPointer: number;
	opCodes: string[];
	clientMessage: ClientMessage;
	wallet: CounterfactualVM;
	// probably not the best data structure
	results: { opCode: string, value: any }[];
	stateChannelInfos: StateChannelInfos;
	appChannelInfos: AppChannelInfos;

	constructor(action: Action, instruction: number, clientMessage: ClientMessage, wallet: CounterfactualVM) {
		this.action = action;
		this.instructionPointer = instruction;
		this.opCodes = Instructions[action.name]
		this.clientMessage = clientMessage;
		this.wallet = wallet;
		this.results = [];
		this.stateChannelInfos = wallet.stateChannelInfos;
		this.appChannelInfos = wallet.appChannelInfos;
	}

	// update: ['generateOp', 'signMyUpdate', 'IoSendMessage', 'waitForIo', 'validateSignatures', 'returnSuccess']
	async next(): Promise<{ done: boolean, value: number }> {
		let op = this.opCodes[this.instructionPointer];
		let internalMessage = new InternalMessage(this.action.name, op, this.clientMessage);

		let value = await this.runMiddlewares(internalMessage);
		this.instructionPointer++;
		this.results.push({ opCode: op, value });
		let done = this.instructionPointer === this.opCodes.length;
		return { value, done };
	}

	// logger, store, syncWallets, instruction itself
	async runMiddlewares(msg: InternalMessage) {
		let resolve;
		let result = new Promise((res, rej) => {
			resolve = res;
		});

		let counter = 0;
		let middlewares = this.wallet.middlewares;
		let opCode = msg.opCode;
		let context = {
			results: this.results,
			stateChannelInfos: this.stateChannelInfos,
			appChannelInfos: this.appChannelInfos,
			instructionPointer: this.instructionPointer
		};

		async function callback() {
			if (counter === middlewares.length - 1) {
				return Promise.resolve(null);
			} else {
				// This is hacky, prevents next from being called more than once
				counter++;
				let middleware = middlewares[counter];
				console.log('counter', counter);
				if (middleware.scope === '*' || middleware.scope === opCode) {
					return middleware.method(msg, callback, context);
				} else {
					return callback();
				}
			}
		}
		return middlewares[counter].method(msg, callback, context);
	}

	[Symbol.asyncIterator]() {
		return {
			next: () => this.next()
		}
	}

	executeInstruction(instr) {

	}
}

class CfWallet implements ResponseSink {
	vm: CounterfactualVM;
	ioProvider: IoProvider;

	constructor() {
		this.vm = new CounterfactualVM(this);
		let ioProvider = new IoProvider();
		this.ioProvider = ioProvider;
		this.register('*', async function logger(message, next) {
			console.log('message', message);
			let result = await next();
			console.log('result', result);
			return result;
		});

		this.register('generateOp', async function generateOp(message, next) {

			if (message.actionName === 'update') {

				let nonce = 75;
				const op = CfOpUpdate.operation({
					appId: 'non actually needed',
					cfaddress: 'some address',
					proposedAppState: 'some state',
					moduleUpdateData: 'some state',
					metadata: 'this goes away with this design',
					nonce
				});
				return Promise.resolve(op);
			}
			return Promise.resolve(null);
		});

		this.register('signMyUpdate', async function signMyUpdate(message, next) {
			console.log(message);
			return Promise.resolve({ signature: 'hi', data: { something: 'hello' } });
		});

		this.register('validateSignatures', async function validateSignatures(message, next, context) {
			let incomingMessage = getFirstResult('waitForIo', context.results);
			let op = getFirstResult('generateOp', context.results);
			// do some magic here

			console.log(message);

			return Promise.resolve();
		});

		this.register('IoSendMessage', ioProvider.IoSendMessage.bind(ioProvider));
		this.register('waitForIo', ioProvider.waitForIo.bind(ioProvider));
		this.vm.setupDefaultMiddlewares();
	}

	register(scope: string, method: Function) {
		this.vm.register(scope, method);
	}

	receive(msg: ClientMessage) {
		this.vm.receive(msg);
	}

	sendResponse(res: Response) {
		console.log('sending response', res);
	}
	receiveMessageFromPeer(incoming) {
		this.ioProvider.receiveMessageFromPeer(incoming);
	}
}

interface ResponseSink {
	sendResponse(res: Response)
}

class CounterfactualVM {
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

interface IoMessage {
	appId: string;
	multisig: string;
};
class IoProvider {

	messages: IoMessage[];
	// TODO Refactor this into using an EventEmitter class so we don't do this manually
	listeners: { appId: string, multisig: string, method: Function }[]

	constructor() {
		// setup websockets
		this.messages = [];
		this.listeners = [];
	}

	receiveMessageFromPeer(message: IoMessage) {
		let done = false;
		this.listeners.forEach((listener) => {
			if (listener.appId === message.appId || (!listener.appId && listener.multisig === message.multisig)) {
				listener.method(message);
				done = true;
			}
		});
		if (!done) {
			this.messages.push(message);
		}
	}

	findMessage(multisig?: string, appId?: string): IoMessage {
		let message: IoMessage;
		if (appId) {
			message = this.messages.find((m) => m.appId === appId);
		} else {
			message = this.messages.find((m) => m.multisig === multisig);
		}
		return message;
	}

	listenOnce(method: Function, multisig?: string, appId?: string) {
		let message = this.findMessage(multisig, appId);
		if (!message) {
			this.listeners.push({ appId, multisig, method });
		} else {
			this.messages.splice(this.messages.indexOf(message), 1);
			method(message);
		}
	}

	/*
	each channel messsage is composed of four parts
	1. Channel/AppChannel info that is generated from the context
	2. Body which is the payload provided by the incoming message
	3. Signatures, etc. provided by the VM runtime
	4. Sequence - counter of where in the handshake we are
	*/
	async  IoSendMessage(message: InternalMessage, next: Function, context: Context) {
		let appChannel = context.appChannelInfos[message.clientMessage.appId];
		let stateChannel = appChannel.stateChannel;
		let channelPart = {
			appId: appChannel.id,
			multisig: stateChannel.multisigAddress,
			to: stateChannel.toAddress,
			from: stateChannel.fromAddress
		};

		let seq = { seq: context.instructionPointer };
		let body = { body: message.clientMessage.data };
		let signatures = { signatures: [getFirstResult('signMyUpdate', context.results).value] };
		let io = Object.assign({}, channelPart, seq, body, signatures);
		console.log(context);
		console.log("Pretending to send Io to", io, " with data ");
		return io;
	}

	async waitForIo(message: InternalMessage, next: Function): Promise<IoMessage> {
		// has websocket received a message for this appId/multisig
		// if yes, return the message, if not wait until it does
		console.log(message);
		let resolve: Function;
		let promise = new Promise<IoMessage>((r) => resolve = r);
		this.listenOnce((message) => {
			console.log("it works with msg", message);
			resolve(message)
		}, null, message.clientMessage.appId);
		return promise;
	}
}
function getFirstResult(toFindOpCode: string, results: { value: any, opCode }[]): OpCodeResult {
	return results.find(({ opCode, value }) => opCode === toFindOpCode);
}

describe("Exploring", () => {
	let apServer: APServer;
	let apProvider: ProtocolStoreProvider;
	let apStore: ProtocolStore;

	const PROTOCOL_ID = "0";

	beforeAll(() => {
	});

	afterAll(() => {
	});

	it("IgorXX", async (done) => {
		let wallet = new CfWallet();
		let msg = {
			requestId: '123-456-789',
			appName: 'ethmo',
			appId: 'someAppId',
			action: 'update',
			data: { moduleUpdateData: { someValue: 1 } }
		};
		wallet.receive(msg);
		let incoming = {
			appId: 'someAppId',
			multisig: 'sampleMultisig',
			to: 'fromAddress',
			from: 'toAddress',
			seq: 1,
			body: { moduleUpdateData: { someValue: 1 } },
			signatures: ['hi i am a signature']
		};
		wallet.receiveMessageFromPeer(incoming);
	});
});