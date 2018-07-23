import * as ethers from "ethers";
import {
	CfState,
	AppChannelInfoImpl,
	StateChannelInfoImpl,
	Context
} from "./state";
import {
	CanonicalPeerBalance,
	StateChannelInfos,
	AppChannelInfos,
	ChannelStates,
	NetworkContext,
	OpCodeResult,
	ResponseSink,
	AppChannelInfo,
	StateChannelInfo,
	ClientMessage,
	CfApp,
	FreeBalance,
	PeerBalance
} from "./types";
import { InternalMessage, getFirstResult } from "./vm";
import { CfOpUpdate } from "./cf-operation/cf-op-update";
import { CfOpSetup } from "./cf-operation/cf-op-setup";
import { CfOpInstall } from "./cf-operation/cf-op-install";
import { CfOpUninstall } from "./cf-operation/cf-op-uninstall";

export class StateDiffGenerator {
	static generate(
		message: InternalMessage,
		next: Function,
		context: Context,
		cfState: CfState
	) {
		if (message.actionName === "update") {
			return StateDiffGenerator.updateStateDiff(message, context);
		} else if (message.actionName === "install") {
			return StateDiffGenerator.installStateDiff(message, context, cfState);
		} else if (message.actionName === "uninstall") {
			return StateDiffGenerator.uninstallStateDiff(message, context, cfState);
		}
	}
	static updateStateDiff(message: InternalMessage, context: Context) {
		// todo
		/*
		let appChannelInfo = {};
		let freeBalance;
		let multisig = message.clientMessage.multisigAddress;
			let appChannel = context.appChannelInfos[message.clientMessage.appId];
			// TODO add nonce and encoded app state
			let updatedAppChannel: AppChannelInfo = {
			appState: message.clientMessage.data.appState
			};
			appChannelInfo = { [appChannel.id]: updatedAppChannel };
			let updatedStateChannel = new StateChannelInfoImpl(
			message.clientMessage.toAddress,
			message.clientMessage.fromAddress,
			multisig,
			appChannelInfo,
			freeBalance
			);
			return { [multisig]: updatedStateChannel };
		*/
	}

	static installStateDiff(
		message: InternalMessage,
		context: Context,
		cfState: CfState
	) {
		let multisig = message.clientMessage.multisigAddress;
		let cfAddr = getFirstResult("generateOp", context.results).value.cfAddr;
		let existingFreeBalance = cfState.stateChannel(multisig).freeBalance;
		let uniqueId = 3; // todo
		let localNonce = 1;
		let data = message.clientMessage.data;
		let newAppChannel: AppChannelInfo = {
			id: cfAddr,
			peerA: data.peerA,
			peerB: data.peerB,
			keyA: data.keyA,
			keyB: data.keyB,
			rootNonce: 1,
			encodedState: "0x0", // todo
			localNonce: 1
		};
		let peerA = new PeerBalance(
			existingFreeBalance.peerA.address,
			existingFreeBalance.peerA.balance - data.peerA.balance
		);
		let peerB = new PeerBalance(
			existingFreeBalance.peerB.address,
			existingFreeBalance.peerB.balance - data.peerB.balance
		);
		console.log("peers! = ", peerA, peerB);
		let appChannelInfo = { [newAppChannel.id]: newAppChannel };
		let freeBalance = new FreeBalance(
			peerA,
			peerB,
			existingFreeBalance.localNonce + 1,
			existingFreeBalance.uniqueId
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

	static uninstallStateDiff(
		message: InternalMessage,
		context: Context,
		state: CfState
	) {
		let multisig = message.clientMessage.multisigAddress;
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
			oldFreeBalance.uniqueId
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

export class OpCodeGenerator {
	static generate(message: InternalMessage, next: Function, cfState: CfState) {
		if (message.actionName === "update") {
			let nonce = 75; // todo
			const op = CfOpUpdate.operation({
				appId: "non actually needed",
				cfaddress: "some address",
				proposedAppState: "some state",
				moduleUpdateData: "some state",
				metadata: "this goes away with this design",
				nonce
			});
			return op;
		}
		if (
			message.actionName === "setup" &&
			message.opCodeArgs[0] === "setupNonce"
		) {
			let nonceUniqueId = 1; // todo
			let multisig = message.clientMessage.multisigAddress;
			return CfOpSetup.nonceUpdateOp(
				nonceUniqueId,
				multisig,
				cfState.stateChannel(multisig).owners(),
				cfState.networkContext
			);
		}
		if (
			message.actionName === "setup" &&
			message.opCodeArgs[0] === "setupFreeBalance"
		) {
			let freeBalanceUniqueId = 2; // todo
			let owners = [];
			return CfOpSetup.freeBalanceInstallOp(
				freeBalanceUniqueId,
				message.clientMessage.multisigAddress,
				message.clientMessage.stateChannel.owners(),
				cfState.networkContext
			);
		}
		if (message.actionName === "install") {
			let appKeys = [
				message.clientMessage.data.keyA,
				message.clientMessage.data.keyB
			];
			let multisig = message.clientMessage.multisigAddress;
			let channelKeys = cfState.stateChannel(multisig).owners();
			let uniqueId = 4; // todo
			let app = new CfApp( //todo
				"0x1",
				"",
				channelKeys,
				[message.clientMessage.data.peerA, message.clientMessage.data.peerB],
				null,
				"",
				uniqueId
			);
			let [op, cfAddr] = CfOpInstall.operation(
				cfState.networkContext,
				multisig,
				cfState.freeBalance(multisig),
				channelKeys,
				appKeys,
				app
			);
			return {
				op,
				cfAddr
			};
		}
		if (message.actionName === "uninstall") {
			let multisig = message.clientMessage.multisigAddress;
			let cfAddr = message.clientMessage.appId;
			let op = CfOpUninstall.operation(
				cfState.networkContext,
				multisig,
				cfState.freeBalance(multisig),
				cfState.app(multisig, cfAddr),
				message.clientMessage.data.peerAmounts
			);
		}
	}
}

export class KeyGenerator {
	/**
	 * After generating this machine's app/ephemeral key, mutate the
	 * client message by placing the ephemeral key on it for my address.
	 */
	static generate(message: InternalMessage, next: Function, Context) {
		let wallet = ethers.Wallet.createRandom();
		let installData = message.clientMessage.data;
		if (installData.peerA.address === message.clientMessage.fromAddress) {
			installData.keyA = wallet.address;
		} else {
			installData.keyB = wallet.address;
		}
		return wallet;
	}
}
