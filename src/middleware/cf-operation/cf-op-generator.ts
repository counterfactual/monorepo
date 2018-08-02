import * as ethers from "ethers";
import { CfState, StateChannelInfoImpl, Context } from "../../state";
import {
	zeroBytes32,
	CfFreeBalance,
	CfNonce,
	CfStateChannel
} from "../cf-operation/types";
import { Instruction } from "../../instructions";
import { Signature, Address } from "../../types";
import { InternalMessage, getFirstResult } from "../../vm";
import * as common from "./common";
import { CfOperation } from "./types";
import { CfOpUpdate } from "./cf-op-update";
import { CfOpSetup } from "./cf-op-setup";
import { CfOpInstall } from "./cf-op-install";
import { CfOpUninstall } from "./cf-op-uninstall";

/**
 * Middleware to be used and registered with the VM on OP_GENERATE instructions
 * to generate CfOperations. When combined with signatures from all parties
 * in the state channel, the CfOperation transitions the state to that
 * yielded by STATE_TRANSITION_PROPOSE.
 */
export class CfOpGenerator {
	static generate(
		message: InternalMessage,
		next: Function,
		context: Context,
		cfState: CfState
	) {
		let proposedState = getFirstResult(
			Instruction.STATE_TRANSITION_PROPOSE,
			context.results
		).value;
		let op;
		console.log("Generating = ", message.actionName);
		if (message.actionName === "update") {
			op = this.update(message, context, cfState, proposedState);
		} else if (message.actionName === "setup") {
			op = CfOpGenerator.setup(message, context, cfState, proposedState);
		} else if (message.actionName === "install") {
			op = CfOpGenerator.install(message, context, cfState, proposedState);
		} else if (message.actionName === "uninstall") {
			op = CfOpGenerator.uninstall(message, context, cfState, proposedState);
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

	static update(
		message: InternalMessage,
		context: Context,
		cfState: CfState,
		proposedUpdate: any
	): CfOperation {
		let multisig: Address = message.clientMessage.multisigAddress;
		let appChannel =
			proposedUpdate[multisig].appChannels[message.clientMessage.appId];
		return new CfOpUpdate(
			cfState.networkContext,
			multisig,
			[appChannel.keyA, appChannel.keyB],
			appChannel.appStateHash,
			appChannel.uniqueId,
			appChannel.terms,
			appChannel.cfApp,
			appChannel.localNonce,
			appChannel.timeout
		);
	}

	static setup(
		message: InternalMessage,
		context: Context,
		cfState: CfState,
		proposedSetup: any
	): CfOperation {
		let multisig: Address = message.clientMessage.multisigAddress;
		let signingKeys = [
			message.clientMessage.fromAddress,
			message.clientMessage.toAddress
		];
		let freeBalance = proposedSetup[multisig].freeBalance;
		let nonce = freeBalance.nonce;
		let cfFreeBalance = new CfStateChannel(
			multisig,
			signingKeys,
			CfFreeBalance.contractInterface(cfState.networkContext),
			CfFreeBalance.terms(),
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

	static install(
		message: InternalMessage,
		context: Context,
		cfState: CfState,
		proposedInstall: any
	) {
		let channel = proposedInstall[message.clientMessage.multisigAddress];
		let freeBalance = channel.freeBalance;
		let multisig: Address = message.clientMessage.multisigAddress;
		let appChannel = channel.appChannels[message.clientMessage.appId];

		let app = new CfStateChannel(
			multisig,
			[appChannel.keyA, appChannel.keyB],
			appChannel.cfApp,
			appChannel.terms,
			appChannel.timeout,
			appChannel.uniqueId
		);
		let cfFreeBalance = new CfFreeBalance(
			freeBalance.peerA.address,
			freeBalance.peerA.balance,
			freeBalance.peerB.address,
			freeBalance.peerB.balance,
			freeBalance.uniqueId,
			freeBalance.localNonce,
			freeBalance.localNonce
		);

		let op = new CfOpInstall(
			cfState.networkContext,
			multisig,
			app,
			cfFreeBalance,
			appChannel.dependencyNonce
		);
		return {
			op,
			cfAddr: op.appCfAddress
		};
	}

	static uninstall(
		message: InternalMessage,
		context: Context,
		cfState: CfState,
		proposedUninstall: any
	): CfOperation {
		console.log("proposed = ", proposedUninstall);
		let multisig: Address = message.clientMessage.multisigAddress;
		let cfAddr = message.clientMessage.appId;
		let freeBalance = proposedUninstall[multisig].freeBalance;
		let appChannel = proposedUninstall[multisig].appChannels[cfAddr];

		let cfFreeBalance = new CfFreeBalance(
			freeBalance.peerA.address,
			freeBalance.peerA.balance,
			freeBalance.peerB.address,
			freeBalance.peerB.balance,
			freeBalance.uniqueId,
			freeBalance.localNonce,
			freeBalance.timeout
		);

		let op = new CfOpUninstall(
			cfState.networkContext,
			multisig,
			cfFreeBalance,
			appChannel.dependencyNonce
		);
		return op;
	}
}
