import { InternalMessage, getFirstResult } from "../../vm";
import { CfState, StateChannelInfoImpl, Context } from "../../state";
import {
	Address,
	AppChannelInfo,
	FreeBalance,
	PeerBalance,
	InstallData,
	H256
} from "../../types";
import { zeroBytes32, CfNonce, CfStateChannel } from "../cf-operation/types";

export class InstallProposer {
	static propose(message: InternalMessage, context: Context, state: CfState) {
		let multisig: Address = message.clientMessage.multisigAddress;
		let data: InstallData = message.clientMessage.data;
		let uniqueId = InstallProposer.nextUniqueId(state, multisig);
		let cfAddr = new CfStateChannel(
			multisig,
			[message.clientMessage.data.keyA, message.clientMessage.data.keyB],
			message.clientMessage.data.app,
			message.clientMessage.data.terms,
			data.timeout,
			uniqueId
		).cfAddress();

		// add on for use by other middleware
		message.clientMessage.appId = cfAddr;

		let existingFreeBalance = state.stateChannel(multisig).freeBalance;
		let localNonce = 1;
		let newAppChannel: AppChannelInfo = {
			id: cfAddr,
			uniqueId: uniqueId,
			peerA: data.peerA,
			peerB: data.peerB,
			keyA: data.keyA,
			keyB: data.keyB,
			encodedState: data.encodedAppState,
			localNonce: localNonce,
			timeout: data.timeout,
			terms: data.terms,
			cfApp: data.app,
			dependencyNonce: new CfNonce(uniqueId)
		};
		let peerA = new PeerBalance(
			existingFreeBalance.peerA.address,
			existingFreeBalance.peerA.balance - data.peerA.balance
		);
		let peerB = new PeerBalance(
			existingFreeBalance.peerB.address,
			existingFreeBalance.peerB.balance - data.peerB.balance
		);
		let appChannelInfo = { [newAppChannel.id]: newAppChannel };
		let freeBalance = new FreeBalance(
			peerA,
			peerB,
			existingFreeBalance.localNonce + 1,
			existingFreeBalance.uniqueId,
			data.timeout,
			existingFreeBalance.nonce
		);
		let updatedStateChannel = new StateChannelInfoImpl(
			message.clientMessage.toAddress,
			message.clientMessage.fromAddress,
			multisig,
			appChannelInfo,
			freeBalance
		);
		return { [multisig]: updatedStateChannel };
	}

	static nextUniqueId(state: CfState, multisig: Address): number {
		let channel = state.channelStates[multisig];
		// + 1 for the free balance
		return Object.keys(channel.appChannels).length + 1;
	}
}
