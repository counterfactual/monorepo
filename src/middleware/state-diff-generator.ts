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
	StateChannelInfos
} from "../types";
import { zeroAddress } from "../cf-operation/types";

export class StateDiffGenerator {
	static generate(
		message: InternalMessage,
		next: Function,
		context: Context,
		cfState: CfState
	): StateChannelInfos | void {
		if (message.actionName === "update") {
			return StateDiffGenerator.updateStateDiff(message, context, cfState);
		} else if (message.actionName === "install") {
			return StateDiffGenerator.installStateDiff(message, context, cfState);
		} else if (message.actionName === "uninstall") {
			return StateDiffGenerator.uninstallStateDiff(message, context, cfState);
		} else if (message.actionName === "setup") {
			console.log("Setup action needs no diff generation");
			return;
		} else {
			throw Error("Action name not supported");
		}
	}
	static updateStateDiff(
		message: InternalMessage,
		context: Context,
		state: CfState
	) {
		let multisig: Address = message.clientMessage.multisigAddress;
		let channels = state.stateChannelInfos();

		let appId: string = message.clientMessage.appId;
		let app;
		try {
			app = channels[multisig].appChannels[appId];
		} catch (e) {}

		let updateData: UpdateData = message.clientMessage.data;
		app.encodedState = updateData.encodedAppState;
		app.localNonce += 1;

		return channels;
	}

	static installStateDiff(
		message: InternalMessage,
		context: Context,
		cfState: CfState
	): StateChannelInfos {
		let multisig: Address = message.clientMessage.multisigAddress;
		// FIXME: no cfAddr actually gets retrieved here
		//let cfAddr = getFirstResult(Instruction.OP_GENERATE, context.results).value
		//	.cfAddr;
		let cfAddr = zeroAddress;
		let existingFreeBalance = cfState.stateChannel(multisig).freeBalance;
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
			rootNonce: 1,
			encodedState: "0x3", // todo
			localNonce: 1,
			timeout: data.timeout,
			terms: data.terms,
			cfApp: data.app
		};
		let peerA = new PeerBalance(
			// FIXME: (ts-strict) object should never be undefined
			// @ts-ignore
			existingFreeBalance.peerA.address,
			// @ts-ignore
			existingFreeBalance.peerA.balance - data.peerA.balance
		);
		let peerB = new PeerBalance(
			// @ts-ignore
			existingFreeBalance.peerB.address,
			// @ts-ignore
			existingFreeBalance.peerB.balance - data.peerB.balance
		);
		let appChannelInfo = { [newAppChannel.id]: newAppChannel };
		let freeBalance = new FreeBalance(
			peerA,
			peerB,
			// @ts-ignore
			existingFreeBalance.localNonce + 1,
			// @ts-ignore
			existingFreeBalance.uniqueId,
			data.timeout
		);
		let updatedStateChannel = new StateChannelInfoImpl(
			message.clientMessage.toAddress,
			message.clientMessage.fromAddress,
			multisig,
			appChannelInfo,
			freeBalance
		);
		console.log("installing state diff yay!", updatedStateChannel);
		return { [multisig]: updatedStateChannel };
	}

	static uninstallStateDiff(
		message: InternalMessage,
		context: Context,
		state: CfState
	) {
		let multisig: Address = message.clientMessage.multisigAddress;
		let channels = state.stateChannelInfos();
		let appId = message.clientMessage.appId;
		// delete app
		delete channels[multisig].appChannels[appId];
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
			oldFreeBalance.timeout
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
}
