import * as ethers from "ethers";
import Multisig from "../../contracts/build/contracts/MinimumViableMultisig.json";
import networkFile from "../../contracts/networks/7777777.json";
import {
	ClientQuery,
	ClientQueryType,
	ClientResponse,
	UserDataClientResponse,
	ClientMessage,
	Notification,
	WalletMessaging,
	WalletMessage,
	WalletResponse,
	ActionName,
	ClientActionMessage,
	NetworkContext
} from "../types";

import { StateChannelClient } from "./state-channel-client";
import { applyMixins } from "../mixins/apply";
import { Observable, NotificationType } from "../mixins/observable";

export class ClientInterface implements Observable {
	wallet: WalletMessaging;
	userId: string;
	userAddress?: string;
	ioHandler?: Function;

	outstandingRequests: {
		[key: string]: { resolve: Function; reject: Function };
	};
	stateChannels: { [key: string]: StateChannelClient };
	private observerCallbacks: Map<string, Function>;

	// Obserable
	observers: Map<NotificationType, Function[]> = new Map();
	registerObserver(type: NotificationType, callback: Function) {}
	unregisterObserver(type: NotificationType, callback: Function) {}
	notifyObservers(type: NotificationType, data: object) {}

	constructor(userId: string, wallet: WalletMessaging) {
		this.userId = userId;
		this.wallet = wallet;
		this.outstandingRequests = {};
		this.observerCallbacks = new Map<string, Function>();
		this.stateChannels = {};
	}

	async init() {
		this.clearObservers();
		this.setupListener();
		let userData = await this.queryUser();
		this.userAddress = userData.data.userAddress;
	}

	private clearObservers() {
		this.observers = new Map();
		this.observerCallbacks = new Map<string, Function>();
	}

	requestId(): string {
		return Math.random() + "";
	}

	async queryUser(): Promise<UserDataClientResponse> {
		let userQuery: ClientQuery = {
			requestId: this.requestId(),
			action: ActionName.QUERY,
			query: ClientQueryType.User,
			userId: this.userId
		};
		let userData = (await this.sendMessage(
			userQuery
		)) as UserDataClientResponse;
		return userData;
	}

	registerIOSendMessage(callback: Function) {
		this.ioHandler = callback;
		this.sendMessage({
			requestId: this.requestId(),
			action: ActionName.REGISTER_IO
		});
	}

	sendIOMessage(msg: ClientMessage) {
		if (this.ioHandler) {
			this.ioHandler(msg);
		}
	}

	receiveIOMessage(msg: ClientMessage) {
		let message = {
			action: ActionName.RECEIVE_IO,
			data: msg,
			requestId: this.requestId()
		};
		this.sendMessage(message);
	}

	listenForResponse(requestId: string) {}

	async createChannelWith(
		toAddress: string,
		multisigAddress: string
	): Promise<string> {
		let channel = await this.setup(toAddress, multisigAddress);
		let channelInfo = await channel.queryStateChannel();

		return channelInfo.data.stateChannel.multisigAddress;
	}

	get address(): string {
		// TODO cleanup
		return this.userAddress || "";
	}
	// TODO Add type here
	async sendMessage(message: ClientMessage): Promise<ClientResponse> {
		let id = message.requestId;
		let resolve, reject;
		let promise: Promise<ClientResponse> = new Promise(function(re, rj) {
			resolve = re;
			reject = rj;
		});

		this.outstandingRequests[id] = { resolve, reject };
		this.wallet.postMessage(message, "*");
		return promise;
	}

	// TODO Add type here
	processMessage(message: WalletMessage | WalletResponse | Notification) {
		// TODO handle not finished states
		console.log("processMessage", message);
		if ("requestId" in message) {
			if (this.outstandingRequests[message.requestId]) {
				this.outstandingRequests[message.requestId].resolve(message);
			}
		}
		if ("notificationType" in message) {
			this.notifyObservers(message.notificationType, message);
		}

		// TODO handle failure
	}

	setupListener() {
		this.wallet.onMessage(
			this.userId,
			(message: WalletMessage | WalletResponse) => {
				console.log("client received message", message);
				this.processMessage(message);
			}
		);
	}

	// TODO add methods also on stateChannel and appChannel objects
	addObserver(
		notificationType: string,
		callback: Function
	): Promise<ClientResponse> {
		let observerId = this.requestId();

		this.observerCallbacks.set(observerId, callback);
		this.registerObserver(notificationType, callback);
		console.log("registered observer");

		let message = {
			requestId: this.requestId(),
			action: ActionName.ADD_OBSERVER,
			data: {
				observerId: observerId,
				notificationType: notificationType
			}
		};

		return this.sendMessage(message);
	}

	removeObserver(
		notificationType: string,
		callback: Function
	): Promise<ClientResponse> {
		let observerId;

		this.observerCallbacks.forEach((value: Function, key: string) => {
			if (value === callback) {
				observerId = key;
			}
		});

		if (!observerId) {
			throw Error(`unable to find observer for ${notificationType}`);
		}

		this.unregisterObserver(notificationType, callback);

		let message = {
			requestId: this.requestId(),
			action: ActionName.REMOVE_OBSERVER,
			data: {
				observerId: observerId,
				notificationType: notificationType
			}
		};

		return this.sendMessage(message);
	}

	// TODO: remove `networkContext` when contract linking is setup properly
	static async deployMultisig(
		wallet: ethers.Wallet,
		owners: string[],
		networkContext: NetworkContext
	): Promise<ethers.Contract> {
		Multisig.bytecode = Multisig.bytecode.replace(
			/__Signatures_+/g,
			networkContext.Signatures.substr(2)
		);
		const multisig = new ethers.Contract("", Multisig.abi, wallet);
		const contract = await multisig.deploy(Multisig.bytecode);
		await contract.functions.setup(owners);
		return contract;
	}

	getStateChannel(multisigAddress: string): StateChannelClient {
		return this.stateChannels[multisigAddress];
	}

	getOrCreateStateChannel(
		multisigAddress: string,
		toAddr: string
	): StateChannelClient {
		if (!this.stateChannels[multisigAddress]) {
			this.stateChannels[multisigAddress] = new StateChannelClient(
				toAddr,
				this.address,
				multisigAddress,
				this
			);
		}
		return this.getStateChannel(multisigAddress);
	}

	// TODO pass in actual multisig address and requestId
	async setup(
		toAddr: string,
		multisigAddress: string
	): Promise<StateChannelClient> {
		let message: ClientActionMessage = {
			requestId: this.requestId(),
			appId: undefined,
			action: ActionName.SETUP,
			data: {},
			multisigAddress: multisigAddress,
			toAddress: toAddr,
			fromAddress: this.address,
			stateChannel: undefined,
			seq: 0
		};
		await this.sendMessage(message);

		return this.getOrCreateStateChannel(message.multisigAddress, toAddr);
	}
}

applyMixins(ClientInterface, [Observable]);
