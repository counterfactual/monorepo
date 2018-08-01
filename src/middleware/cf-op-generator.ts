import * as ethers from "ethers";
import { CfState, StateChannelInfoImpl, Context } from "../state";
import {
	zeroBytes32,
	CfFreeBalance,
	CfNonce,
	CfStateChannel
} from "../cf-operation/types";
import { Signature, Address } from "../types";
import { InternalMessage, getFirstResult } from "../vm";
import * as common from "../cf-operation/common";
import { CfOperation } from "../cf-operation/types";
import { CfOpUpdate } from "../cf-operation/cf-op-update";
import { CfOpSetup } from "../cf-operation/cf-op-setup";
import { CfOpInstall } from "../cf-operation/cf-op-install";
import { CfOpUninstall } from "../cf-operation/cf-op-uninstall";

export class CfOpGenerator {
	static generate(message: InternalMessage, next: Function, cfState: CfState) {
		let op;
		if (message.actionName === "update") {
			op = this.update(message, cfState);
		} else if (message.actionName === "setup") {
			op = CfOpGenerator.setup(message, cfState);
		} else if (message.actionName === "install") {
			op = CfOpGenerator.install(message, cfState);
		} else if (message.actionName === "uninstall") {
			op = CfOpGenerator.uninstall(message, cfState);
		}
		// leaving temporarily since the tests aren't checking against the commitments
		// and so we need to exercise their functionality
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
		let nonce = new CfNonce(zeroBytes32, 0);
		let terms = CfFreeBalance.terms();
		let appInterface = CfFreeBalance.contractInterface(cfState.networkContext);
		let cfFreeBalance = new CfStateChannel(
			multisig,
			signingKeys,
			appInterface,
			terms,
			freeBalance.timeout,
			freeBalance.uniqueId
		);
		return new CfOpSetup(
			cfState.networkContext,
			multisig,
			cfFreeBalance,
			nonce
		);
	}

	static install(message: InternalMessage, cfState: CfState) {
		let data = message.clientMessage.data;
		let appKeys = [data.keyA, data.keyB];
		let multisig: Address = message.clientMessage.multisigAddress;
		let channelKeys = cfState.stateChannel(multisig).owners();
		let freeBalance = cfState.stateChannel(multisig).freeBalance;

		let peerAInstallInfo = message.clientMessage.data.peerA;
		let alice = peerAInstallInfo.address;
		let aliceFreeBalance = freeBalance.peerA.balance - peerAInstallInfo.balance;

		let peerBInstallInfo = message.clientMessage.data.peerB;
		let bob = peerBInstallInfo.address;
		let bobFreeBalance = freeBalance.peerB.balance - peerBInstallInfo.balance;

		let app = new CfStateChannel(
			multisig,
			channelKeys,
			data.app,
			data.terms,
			100, // timeout todo
			4 // unique id todo
		);
		let cfFreeBalance = new CfFreeBalance(
			alice,
			aliceFreeBalance,
			bob,
			bobFreeBalance,
			freeBalance.uniqueId,
			freeBalance.localNonce + 1,
			100 // timeout
		);
		let dependencyNonce = new CfNonce(zeroBytes32, 0);

		let op = new CfOpInstall(
			cfState.networkContext,
			multisig,
			app,
			cfFreeBalance,
			dependencyNonce
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

		let cfFreeBalance = new CfFreeBalance(
			freeBalance.peerA.address,
			freeBalance.peerA.balance,
			freeBalance.peerB.address,
			freeBalance.peerB.balance,
			freeBalance.uniqueId,
			freeBalance.localNonce,
			100 // timeout
		);
		let dependencyNonce = new CfNonce(
			zeroBytes32, // todo
			0
		);
		let op = new CfOpUninstall(
			cfState.networkContext,
			multisig,
			cfFreeBalance,
			dependencyNonce
		);
		return op;
	}
}
