import * as ethers from "ethers";
import { CfState, StateChannelInfoImpl, Context } from "../../state";
import {
	zeroBytes32,
	CfFreeBalance,
	CfNonce,
	CfStateChannel
} from "../cf-operation/types";
import { Instruction } from "../../instructions";
import { Signature, Address, InternalMessage, H256 } from "../../types";
import { getFirstResult } from "../../vm";
import * as common from "./common";
import { CfOperation } from "./types";
import { CfOpUpdate } from "./cf-op-update";
import { CfOpSetup } from "./cf-op-setup";
import { CfOpInstall } from "./cf-op-install";
import { CfOpUninstall } from "./cf-op-uninstall";
import { CfOpGenerator } from "../middleware";

/**
 * Middleware to be used and registered with the VM on OP_GENERATE instructions
 * to generate CfOperations. When combined with signatures from all parties
 * in the state channel, the CfOperation transitions the state to that
 * yielded by STATE_TRANSITION_PROPOSE.
 */
export class EthCfOpGenerator extends CfOpGenerator {
	generate(
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
			op = this.update(message, context, cfState, proposedState.state);
		} else if (message.actionName === "setup") {
			op = this.setup(message, context, cfState, proposedState.state);
		} else if (message.actionName === "install") {
			op = this.install(
				message,
				context,
				cfState,
				proposedState.state,
				proposedState.cfAddr
			);
		} else if (message.actionName === "uninstall") {
			op = this.uninstall(message, context, cfState, proposedState.state);
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

	update(
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

	setup(
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

	install(
		message: InternalMessage,
		context: Context,
		cfState: CfState,
		proposedInstall: any,
		cfAddr: H256
	) {
		let channel = proposedInstall[message.clientMessage.multisigAddress];
		let freeBalance = channel.freeBalance;
		let multisig: Address = message.clientMessage.multisigAddress;
		let appChannel = channel.appChannels[cfAddr];

		let app = new CfStateChannel(
			multisig,
			[appChannel.keyA, appChannel.keyB],
			appChannel.cfApp,
			appChannel.terms,
			appChannel.timeout,
			appChannel.uniqueId
		);
		let cfFreeBalance = new CfFreeBalance(
			freeBalance.alice,
			freeBalance.aliceBalance,
			freeBalance.bob,
			freeBalance.bobBalance,
			freeBalance.uniqueId,
			freeBalance.localNonce,
			freeBalance.timeout,
			freeBalance.nonce
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

	uninstall(
		message: InternalMessage,
		context: Context,
		cfState: CfState,
		proposedUninstall: any
	): CfOperation {
		let multisig: Address = message.clientMessage.multisigAddress;
		let cfAddr = message.clientMessage.appId;
		let freeBalance = proposedUninstall[multisig].freeBalance;
		let appChannel = proposedUninstall[multisig].appChannels[cfAddr];

		let cfFreeBalance = new CfFreeBalance(
			freeBalance.alice,
			freeBalance.aliceBalance,
			freeBalance.bob,
			freeBalance.bobBalance,
			freeBalance.uniqueId,
			freeBalance.localNonce,
			freeBalance.timeout,
			freeBalance.nonce
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
