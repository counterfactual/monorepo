import {
	UpdateData,
	UpdateOptions,
	PeerBalance,
	ClientResponse,
	ActionName
} from "../types";
import { CfAppInterface } from "../middleware/cf-operation/types";

import { StateChannelClient } from "./state-channel-client";

export class AppChannelClient {
	stateChannel: StateChannelClient;
	appName: string;
	appId: string;
	appInterface: CfAppInterface;

	constructor(
		stateChannel: StateChannelClient,
		appName: string,
		appId: string,
		appInterface: CfAppInterface,
		options
	) {
		this.stateChannel = stateChannel;
		this.appName = appName;
		this.appId = appId;
		this.appInterface = appInterface;
	}

	async update(options: UpdateOptions): Promise<ClientResponse> {
		let encodedAppState = this.appInterface.encode(options.state);
		let appStateHash = this.appInterface.stateHash(options.state);
		let updateData: UpdateData = {
			encodedAppState,
			appStateHash
		};
		let message = {
			requestId: this.stateChannel.clientInterface.requestId(),
			appName: this.appName,
			appId: this.appId,
			action: ActionName.UPDATE,
			data: updateData,
			multisigAddress: this.stateChannel.multisigAddress,
			fromAddress: this.stateChannel.fromAddress,
			toAddress: this.stateChannel.toAddress,
			stateChannel: undefined,
			seq: 0
		};
		return await this.stateChannel.clientInterface.sendMessage(message);
	}

	async uninstall(options): Promise<ClientResponse> {
		let uninstallData = {
			peerAmounts: [
				new PeerBalance(this.stateChannel.fromAddress, options.amount),
				new PeerBalance(this.stateChannel.toAddress, 0)
			]
		};

		let message = {
			requestId: this.stateChannel.clientInterface.requestId(),
			appName: this.appName,
			appId: this.appId,
			action: ActionName.UNINSTALL,
			data: uninstallData,
			multisigAddress: this.stateChannel.multisigAddress,
			fromAddress: this.stateChannel.fromAddress,
			toAddress: this.stateChannel.toAddress,
			stateChannel: undefined,
			seq: 0
		};
		return await this.stateChannel.clientInterface.sendMessage(message);
	}
}
