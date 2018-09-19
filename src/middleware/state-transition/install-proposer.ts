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
	CfFreeBalance,
	CfNonce,
	CfStateChannel,
	CfAppInterface,
	Terms
} from "../cf-operation/types";
import { getLastResult } from "../middleware";
import { Instruction } from "../../instructions";

export class InstallProposer {
	static propose(
		message: InternalMessage,
		context: Context,
		state: CfState
	): StateProposal {
		let multisig: Address = message.clientMessage.multisigAddress;
		let data: InstallData = message.clientMessage.data;
		let app = new CfAppInterface(
			data.app.address,
			data.app.applyAction,
			data.app.resolve,
			data.app.getTurnTaker,
			data.app.isStateTerminal,
			data.app.abiEncoding
		);
		let terms = new Terms(
			data.terms.assetType,
			data.terms.limit,
			data.terms.token
		);
		let uniqueId = InstallProposer.nextUniqueId(state, multisig);
		let signingKeys = InstallProposer.newSigningKeys(context, data);
		let cfAddr = InstallProposer.proposedCfAddress(
			state,
			message,
			app,
			terms,
			signingKeys,
			uniqueId
		);
		let existingFreeBalance = state.stateChannel(multisig).freeBalance;
		let newAppChannel = InstallProposer.newAppChannel(
			cfAddr,
			data,
			app,
			terms,
			signingKeys,
			uniqueId
		);
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

	private static newSigningKeys(
		context: Context,
		data: InstallData
	): Array<string> {
		let lastResult = getLastResult(Instruction.IO_WAIT, context.results);

		if (lastResult && lastResult.value && lastResult.value.data) {
			return [lastResult.value.data.keyA, lastResult.value.data.keyB];
		} else {
			return [data.keyA!, data.keyB!];
		}
	}

	private static newAppChannel(
		cfAddr: H256,
		data: InstallData,
		app: CfAppInterface,
		terms: Terms,
		signingKeys: Array<string>,
		uniqueId: number
	): AppChannelInfo {
		return {
			id: cfAddr,
			uniqueId: uniqueId,
			peerA: data.peerA,
			peerB: data.peerB,
			keyA: signingKeys[0],
			keyB: signingKeys[1],
			encodedState: data.encodedAppState,
			localNonce: 1,
			timeout: data.timeout,
			terms: terms,
			cfApp: app,
			dependencyNonce: new CfNonce(uniqueId)
		};
	}

	private static proposedCfAddress(
		state: CfState,
		message: InternalMessage,
		app: CfAppInterface,
		terms: Terms,
		signingKeys: Array<string>,
		uniqueId: number
	): H256 {
		return new CfStateChannel(
			state.networkContext,
			message.clientMessage.multisigAddress,
			signingKeys,
			app,
			terms,
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
