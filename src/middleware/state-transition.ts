import { InternalMessage, getFirstResult } from "../vm";
import { CfState, StateChannelInfoImpl, Context } from "../state";
import {
	Address,
	CanonicalPeerBalance,
	AppChannelInfo,
	ClientMessage,
	FreeBalance,
	PeerBalance,
	UpdateData,
	InstallData,
	Signature,
	StateChannelInfos,
	H256
} from "../types";
import { Instruction } from "../instructions";
import {
	zeroAddress,
	zeroBytes32,
	CfNonce,
	CfStateChannel
} from "./cf-operation/types";

/**
 * The proposed state transitions do not complete a state upate. They give
 * a "proposed" state update that should not be enacted until both
 * STATE_TRANSITION_PREPARE and STATE_TRANSITION_COMMIT instructions have
 * been executed.
 */
export class StateTransition {
	static propose(
		message: InternalMessage,
		next: Function,
		context: Context,
		cfState: CfState
	) {
		if (message.actionName === "update") {
			return StateTransition.proposeUpdate(message, context, cfState);
		} else if (message.actionName === "install") {
			return StateTransition.proposeInstall(message, context, cfState);
		} else if (message.actionName === "uninstall") {
			return StateTransition.proposeUninstall(message, context, cfState);
		} else if (message.actionName === "setup") {
			return StateTransition.proposeSetup(message, context, cfState);
		} else {
			throw Error("Action name not supported");
		}
	}

	private static proposeUpdate(
		message: InternalMessage,
		context: Context,
		state: CfState
	) {
		let multisig: Address = message.clientMessage.multisigAddress;
		let channels = state.stateChannelInfos();

		let appId: H256 = message.clientMessage.appId;
		let app;
		try {
			app = channels[multisig].appChannels[appId];
		} catch (e) {}

		let updateData: UpdateData = message.clientMessage.data;
		app.appStateHash = updateData.appStateHash;
		app.encodedState = updateData.encodedAppState;
		app.localNonce += 1;

		return channels;
	}

	private static proposeInstall(
		message: InternalMessage,
		context: Context,
		state: CfState
	) {
		let multisig: Address = message.clientMessage.multisigAddress;
		let cfAddr = new CfStateChannel(
			multisig,
			[message.clientMessage.data.keyA, message.clientMessage.data.keyB],
			message.clientMessage.data.app,
			message.clientMessage.data.terms,
			100, // timeout todo
			4 // unique id todo
		).cfAddress();
		// add on for use by other middleware
		message.clientMessage.appId = cfAddr;
		let existingFreeBalance = state.stateChannel(multisig).freeBalance;
		let uniqueId = 3; // todo
		let localNonce = 1;
		let data: InstallData = message.clientMessage.data;
		let newAppChannel: AppChannelInfo = {
			id: cfAddr,
			uniqueId: uniqueId,
			peerA: data.peerA,
			peerB: data.peerB,
			keyA: data.keyA,
			keyB: data.keyB,
			encodedState: "0x3", // todo
			localNonce: 1,
			timeout: data.timeout,
			terms: data.terms,
			cfApp: data.app,
			dependencyNonce: new CfNonce(zeroBytes32, 0)
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

	private static proposeUninstall(
		message: InternalMessage,
		context: Context,
		state: CfState
	) {
		let multisig: Address = message.clientMessage.multisigAddress;
		let channels = state.stateChannelInfos();
		let appId = message.clientMessage.appId;
		// delete the app by bumping the nonce
		channels[multisig].appChannels[appId].dependencyNonce.nonce += 1;
		// add balance and update nonce
		let canon = CanonicalPeerBalance.canonicalize(
			message.clientMessage.data.peerAmounts[0],
			message.clientMessage.data.peerAmounts[1]
		);
		let oldFreeBalance = channels[multisig].freeBalance;
		let newFreeBalance = new FreeBalance(
			new PeerBalance(
				oldFreeBalance.peerA.address,
				oldFreeBalance.peerA.balance + canon.peerA.balance
			),
			new PeerBalance(
				oldFreeBalance.peerB.address,
				oldFreeBalance.peerB.balance + canon.peerB.balance
			),
			oldFreeBalance.localNonce + 1,
			oldFreeBalance.uniqueId,
			oldFreeBalance.timeout,
			oldFreeBalance.nonce
		);
		let chan = channels[multisig];
		// now replace the state channel with a newly updated one
		channels[multisig] = new StateChannelInfoImpl(
			chan.toAddress,
			chan.fromAddress,
			multisig,
			chan.appChannels,
			newFreeBalance
		);
		return channels;
	}

	private static proposeSetup(
		message: InternalMessage,
		context: Context,
		state: CfState
	) {
		let toAddress = message.clientMessage.toAddress;
		let fromAddress = message.clientMessage.fromAddress;
		let balances = PeerBalance.balances(toAddress, 0, fromAddress, 0);
		let uniqueId = 2; // todo
		let localNonce = 1;
		let timeout = 100; // todo, probably some default timeout
		let freeBalance = new FreeBalance(
			balances.peerA,
			balances.peerB,
			localNonce,
			uniqueId,
			timeout,
			new CfNonce(zeroBytes32, 0)
		);
		let stateChannel = new StateChannelInfoImpl(
			toAddress,
			fromAddress,
			message.clientMessage.multisigAddress,
			{},
			freeBalance
		);
		message.clientMessage.stateChannel = stateChannel;
		let channels = {
			[String(message.clientMessage.multisigAddress)]: stateChannel
		};
		// TODO we shouldn't mutate state until we get to COMMIT
		context.vm.mutateState(channels);
		return channels;
	}

	static prepare(
		message: InternalMessage,
		next: Function,
		context: Context,
		cfState: CfState
	) {
		// todo
	}

	static commit(
		message: InternalMessage,
		next: Function,
		context: Context,
		cfState: CfState
	) {
		let newState = getFirstResult(
			Instruction.STATE_TRANSITION_PROPOSE,
			context.results
		);
		context.vm.mutateState(newState.value);
	}
}
