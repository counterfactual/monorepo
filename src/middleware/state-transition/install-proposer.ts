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

		let cfAddr = new CfStateChannel(
			multisig,
			[message.clientMessage.data.keyA, message.clientMessage.data.keyB],
			message.clientMessage.data.app,
			message.clientMessage.data.terms,
			data.timeout,
			4 // unique id todo
		).cfAddress();

		// add on for use by other middleware
		message.clientMessage.appId = cfAddr;

		let existingFreeBalance = state.stateChannel(multisig).freeBalance;
		let uniqueId = 3; // todo
		let localNonce = 1;
		let newAppChannel: AppChannelInfo = {
			id: cfAddr,
			uniqueId: uniqueId,
			peerA: data.peerA,
			peerB: data.peerB,
			keyA: data.keyA,
			keyB: data.keyB,
			encodedState: data.encodedAppState,
			localNonce: 1,
			timeout: data.timeout,
			terms: data.terms,
			cfApp: data.app,
			dependencyNonce: new CfNonce(zeroBytes32, 0) // todo
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
}
