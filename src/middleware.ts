import * as ethers from "ethers";
import { CfState, StateChannelInfoImpl, Context } from "./state";
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
} from "./types";
import { InternalMessage, getFirstResult } from "./vm";
import { zeroBytes32, zeroAddress } from "./cf-operation/types";
import { CfOperation } from "./cf-operation/types";
import { CfOpUpdate } from "./cf-operation/cf-op-update";
import { CfOpSetup } from "./cf-operation/cf-op-setup";
import { CfOpInstall } from "./cf-operation/cf-op-install";
import { CfOpUninstall } from "./cf-operation/cf-op-uninstall";
import { Instruction } from "./instructions";

export class NextMsgGenerator {
	static generate(
		internalMessage: InternalMessage,
		next: Function,
		context: Context
	) {
		let message = internalMessage.clientMessage;
		let msg: ClientMessage = {
			requestId: "none this should be a notification on completion",
			appName: message.appName,
			appId: message.appId,
			action: message.action,
			data: message.data,
			multisigAddress: message.multisigAddress,
			toAddress: message.fromAddress, // swap to/from here since sending to peer
			fromAddress: message.toAddress,
			seq: message.seq + 1
		};
		// need to bump the seqeunce number, so that, when we send out another IO
		// msg we give the correct one to the nextMsg.
		internalMessage.clientMessage.seq += 1;
		return msg;
	}
}

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

export class OpCodeGenerator {
	static generate(message: InternalMessage, next: Function, cfState: CfState) {
		let op;
		if (message.actionName === "update") {
			op = this.update(message, cfState);
		} else if (message.actionName === "setup") {
			op = OpCodeGenerator.setup(message, cfState);
		} else if (message.actionName === "install") {
			op = OpCodeGenerator.install(message, cfState);
		} else if (message.actionName === "uninstall") {
			op = OpCodeGenerator.uninstall(message, cfState);
		}
		if (op != null) {
			let sigA = new Signature(
				28,
				"0x11111111111111111111111111111111",
				"0x22222222222222222222222222222222"
			);
			let sigB = new Signature(
				28,
				"0x11111111111111111111111111111111",
				"0x22222222222222222222222222222222"
			);
			if (message.actionName === "install") {
				console.log(op.op.hashToSign());
				console.log(op.op.transaction([sigA, sigB]));
			} else {
				console.log(op.hashToSign());
				console.log(op.transaction([sigA, sigB]));
			}
		}
		return op;
	}

	static update(message: InternalMessage, cfState: CfState): CfOperation {
		let multisig: Address = message.clientMessage.multisigAddress;
		let cfAddr = message.clientMessage.appId;
		let appChannel = cfState.app(multisig, cfAddr);
		let signingKeys = [appChannel.keyA, appChannel.keyB];
		let appStateHash = message.clientMessage.data.appStateHash;
		return new CfOpUpdate(
			cfState.networkContext,
			multisig,
			signingKeys,
			appStateHash,
			appChannel.uniqueId,
			appChannel.terms,
			appChannel.cfApp,
			appChannel.localNonce + 1,
			appChannel.timeout
		);
	}

	static setup(message: InternalMessage, cfState: CfState): CfOperation {
		let multisig: Address = message.clientMessage.multisigAddress;
		// todo: need to decide if we want ephemeral keys for free balance
		let signingKeys = [
			message.clientMessage.fromAddress,
			message.clientMessage.toAddress
		];
		let freeBalance = cfState.channelStates[multisig].freeBalance;
		let nonceRegistryKey = zeroBytes32;
		let nonceRegistryNonce = 0;
		return new CfOpSetup(
			cfState.networkContext,
			multisig,
			signingKeys,
			freeBalance.uniqueId,
			nonceRegistryKey,
			nonceRegistryNonce,
			freeBalance.timeout
		);
	}

	static install(message: InternalMessage, cfState: CfState) {
		let data = message.clientMessage.data;
		let appKeys = [data.keyA, data.keyB];
		let multisig: Address = message.clientMessage.multisigAddress;
		let channelKeys = cfState.stateChannel(multisig).owners();
		let appUniqueId = 4; // todo
		let freeBalance = cfState.stateChannel(multisig).freeBalance;

		let peerAInstallInfo = message.clientMessage.data.peerA;
		let alice = peerAInstallInfo.address;
		let aliceFreeBalance = freeBalance.peerA.balance - peerAInstallInfo.balance;

		let peerBInstallInfo = message.clientMessage.data.peerB;
		let bob = peerBInstallInfo.address;
		let bobFreeBalance = freeBalance.peerB.balance - peerBInstallInfo.balance;

		// todo
		let timeout = 0;
		let dependencyNonceSalt = zeroBytes32;
		let dependencyNonceNonce = 0;
		let op = new CfOpInstall(
			cfState.networkContext,
			multisig,
			appUniqueId,
			channelKeys,
			freeBalance.uniqueId,
			freeBalance.localNonce + 1,
			alice,
			aliceFreeBalance,
			bob,
			bobFreeBalance,
			dependencyNonceSalt,
			dependencyNonceNonce,
			data.terms,
			data.app,
			timeout
		);
		return {
			op,
			cfAddr: op.appCfAddress
		};
	}

	static uninstall(message: InternalMessage, cfState: CfState): CfOperation {
		let multisig: Address = message.clientMessage.multisigAddress;
		let cfAddr = message.clientMessage.appId;
		let freeBalance = cfState.stateChannel(multisig).freeBalance;
		let appChannel = cfState.app(multisig, cfAddr);
		let signingKeys = [appChannel.keyA, appChannel.keyB];
		let dependencyNonceNonce = 0; // todo
		let dependencyNonceSalt = zeroBytes32; // todo
		let op = new CfOpUninstall(
			cfState.networkContext,
			multisig,
			signingKeys,
			freeBalance.uniqueId,
			freeBalance.localNonce,
			freeBalance.peerA.address,
			freeBalance.peerA.balance,
			freeBalance.peerB.address,
			freeBalance.peerB.balance,
			dependencyNonceSalt,
			dependencyNonceNonce,
			appChannel.timeout
		);
		return op;
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

export class SignatureValidator {
	static async validate(
		message: InternalMessage,
		next: Function,
		context: Context
	) {
		let incomingMessage = getFirstResult(Instruction.IO_WAIT, context.results);
		let op = getFirstResult(Instruction.OP_GENERATE, context.results);
		// now validate the signature against the op hash
	}
}
