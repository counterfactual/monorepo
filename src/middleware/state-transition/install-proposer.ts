import { CfState, StateChannelInfoImpl, Context } from "../../state";
import {
	Address,
	AppChannelInfo,
	PeerBalance,
	InstallData,
	H256,
	InternalMessage,
	StateProposal
} from "../../types";
import {
	zeroBytes32,
	CfFreeBalance,
	CfNonce,
	CfStateChannel
} from "../cf-operation/types";

export class InstallProposer {
	static propose(
		message: InternalMessage,
		context: Context,
		state: CfState
	): StateProposal {
		let multisig: Address = message.clientMessage.multisigAddress;
		let data: InstallData = message.clientMessage.data;
		let uniqueId = InstallProposer.nextUniqueId(state, multisig);
		let cfAddr = InstallProposer.proposedCfAddress(state, message, uniqueId);
		let existingFreeBalance = state.stateChannel(multisig).freeBalance;
		let newAppChannel = InstallProposer.newAppChannel(cfAddr, data, uniqueId);
		let [peerA, peerB] = InstallProposer.newPeers(existingFreeBalance, data);
		let freeBalance = new CfFreeBalance(
			peerA.address,
			peerA.balance,
			peerB.address,
			peerB.balance,
			existingFreeBalance.uniqueId,
			existingFreeBalance.localNonce + 1,
			data.timeout,
			existingFreeBalance.nonce
		);
		let updatedStateChannel = new StateChannelInfoImpl(
			message.clientMessage.toAddress,
			message.clientMessage.fromAddress,
			multisig,
			{ [newAppChannel.id]: newAppChannel },
			freeBalance
		);

		return {
			cfAddr,
			state: { [multisig]: updatedStateChannel }
		};
	}

	private static newAppChannel(
		cfAddr: H256,
		data: InstallData,
		uniqueId: number
	): AppChannelInfo {
		return {
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
			dependencyNonce: new CfNonce(uniqueId)
		};
	}

	private static proposedCfAddress(
		state: CfState,
		message: InternalMessage,
		uniqueId: number
	): H256 {
		return new CfStateChannel(
			state.networkContext,
			message.clientMessage.multisigAddress,
			[message.clientMessage.data.keyA, message.clientMessage.data.keyB],
			message.clientMessage.data.app,
			message.clientMessage.data.terms,
			message.clientMessage.data.timeout,
			uniqueId
		).cfAddress();
	}

	private static newPeers(
		existingFreeBalance: CfFreeBalance,
		data: InstallData
	): [PeerBalance, PeerBalance] {
		let peerA = new PeerBalance(
			existingFreeBalance.alice,
			existingFreeBalance.aliceBalance - data.peerA.balance
		);
		let peerB = new PeerBalance(
			existingFreeBalance.bob,
			existingFreeBalance.bobBalance - data.peerB.balance
		);
		return [peerA, peerB];
	}

	private static nextUniqueId(state: CfState, multisig: Address): number {
		let channel = state.channelStates[multisig];
		// + 1 for the free balance
		return Object.keys(channel.appChannels).length + 1;
	}
}
