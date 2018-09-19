import * as ethers from "ethers";
import PaymentApp from "../contracts/build/contracts/PaymentApp.json";
import {
	ClientQuery,
	FreeBalanceClientResponse,
	InstallData,
	InstallOptions,
	StateChannelDataClientResponse,
	PeerBalance,
	ClientQueryType,
	ActionName
} from "../src/types";

import {
	Terms,
	CfAppInterface,
	zeroAddress
} from "../src/middleware/cf-operation/types";

import { ClientInterface } from "./client-interface";
import { AppChannelClient } from "./app-channel-client";

const Contracts = {
	PaymentApp
};

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
		let capitalizedAppName = appName[0].toUpperCase() + appName.slice(1);
		let contract = Contracts[capitalizedAppName];
		let address = contract
			? contract.networks[Object.keys(contract.networks)[0]].address
			: "0x0";
		let abiInterface = new ethers.Interface(contract ? contract.abi : "");

		return new CfAppInterface(
			address,
			CfAppInterface.generateSighash(abiInterface, "applyAction"),
			CfAppInterface.generateSighash(abiInterface, "resolve"),
			CfAppInterface.generateSighash(abiInterface, "turn"),
			CfAppInterface.generateSighash(abiInterface, "isStateTerminal"),
			abiEncoding
		);
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
			peerB: new PeerBalance(peerB, options.peerBBalance),
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

		return stateChannelData;
	}
}
