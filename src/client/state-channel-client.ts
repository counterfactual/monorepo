import * as ethers from "ethers";
import {
	ClientQuery,
	FreeBalanceClientResponse,
	InstallData,
	InstallOptions,
	StateChannelDataClientResponse,
	PeerBalance,
	ClientQueryType,
	ActionName
} from "../types";
import { PaymentApp } from "../middleware/cf-operation/contracts/paymentApp";

import {
	Terms,
	CfAppInterface,
	zeroAddress
} from "../middleware/cf-operation/types";

import { ClientInterface } from "./client-interface";

import { AppChannelClient } from "./app-channel-client";

export class StateChannelClient {
	clientInterface: ClientInterface;
	toAddress: string;
	fromAddress: string;
	multisigAddress: string;

	constructor(
		toAddress: string,
		fromAddress: string,
		multisigAddress: string,
		clientInterface: ClientInterface
	) {
		this.clientInterface = clientInterface;
		this.multisigAddress = multisigAddress;
		this.toAddress = toAddress;
		this.fromAddress = fromAddress;
	}
	private buildAppInterface(
		appName: string,
		abiEncoding: string
	): CfAppInterface {
		switch (appName.toLowerCase()) {
			case "paymentapp":
				return new CfAppInterface( // todo
					"0x0290fb167208af455bb137780163b7b7a9a10c16",
					"0x00000000",
					new ethers.Interface(PaymentApp.abi).functions.resolver.sighash,
					"0x00000000",
					"0x00000000",
					abiEncoding
				);
			default:
				return new CfAppInterface(
					"0x0",
					"0x00000000",
					"0x00000000",
					"0x00000000",
					"0x00000000",
					abiEncoding
				);
		}
	}

	async install(
		appName: string,
		options: InstallOptions
	): Promise<AppChannelClient> {
		let peerA = this.fromAddress;
		let peerB = this.toAddress;
		if (peerB.localeCompare(peerA) < 0) {
			let tmp = peerA;
			peerA = peerB;
			peerB = tmp;
		}
		let terms = new Terms(0, 10, zeroAddress); // todo

		let app = this.buildAppInterface(appName, options.abiEncoding);
		let state = options.state;
		let encodedAppState = app.encode(state);
		let timeout = 100;
		let installData: InstallData = {
			peerA: new PeerBalance(peerA, options.peerABalance),
			peerB: new PeerBalance(peerB, 0),
			// TODO provide actual signing keys?
			keyA: this.toAddress,
			keyB: this.fromAddress,
			encodedAppState,
			terms,
			app,
			timeout
		};
		let requestId = this.clientInterface.requestId();
		let message = {
			requestId: requestId,
			appName: appName,
			appId: undefined,
			action: ActionName.INSTALL,
			data: installData,
			multisigAddress: this.multisigAddress,
			toAddress: this.toAddress,
			fromAddress: this.fromAddress,
			stateChannel: undefined,
			seq: 0
		};

		return new Promise<AppChannelClient>(async resolve => {
			let cb = data => {
				if (data.data.requestId !== requestId) return;
				let appId = data.data.result.cfAddr;

				return resolve(
					new AppChannelClient(this, appName, appId, app, options)
				);
			};

			await this.clientInterface.addObserver("installCompleted", cb);
			await this.clientInterface.sendMessage(message);
			this.clientInterface.removeObserver("installCompleted", cb);
		});
	}

	restore(
		appName: string,
		appId: string,
		abiEncoding: string,
		options: object
	): AppChannelClient {
		let appInterface = this.buildAppInterface(appName, abiEncoding);
		return new AppChannelClient(this, appName, appId, appInterface, options);
	}

	async queryFreeBalance(): Promise<FreeBalanceClientResponse> {
		let freeBalanceQuery: ClientQuery = {
			requestId: this.clientInterface.requestId(),
			action: ActionName.QUERY,
			query: ClientQueryType.FreeBalance,
			multisigAddress: this.multisigAddress
		};
		let freeBalanceData = (await this.clientInterface.sendMessage(
			freeBalanceQuery
		)) as FreeBalanceClientResponse;
		console.log("receiverd freeBalanceData", freeBalanceData);
		return freeBalanceData;
	}

	async queryStateChannel(): Promise<StateChannelDataClientResponse> {
		let stateChannelQuery: ClientQuery = {
			action: ActionName.QUERY,
			requestId: this.clientInterface.requestId(),
			query: ClientQueryType.StateChannel,
			multisigAddress: this.multisigAddress
		};
		let stateChannelData = (await this.clientInterface.sendMessage(
			stateChannelQuery
		)) as StateChannelDataClientResponse;
		console.log("receiverd stateChannelData", stateChannelData);
		return stateChannelData;
	}
}
