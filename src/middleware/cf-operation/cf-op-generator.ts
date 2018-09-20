import { CfState, Context } from "../../state";
import {
	CfOperation,
	CfAppInterface,
	Terms,
	CfFreeBalance,
	CfStateChannel
} from "./types";
import { CfOpSetState } from "./cf-op-setstate";
import { CfOpSetup } from "./cf-op-setup";
import { CfOpInstall } from "./cf-op-install";
import { CfOpUninstall } from "./cf-op-uninstall";
import { CfOpGenerator, getFirstResult } from "../middleware";
import {
	InternalMessage,
	ActionName,
	Signature,
	Address,
	CanonicalPeerBalance,
	PeerBalance,
	H256
} from "../../types";
import { Instruction } from "../../instructions";

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
	): CfOperation {
		let proposedState = getFirstResult(
			Instruction.STATE_TRANSITION_PROPOSE,
			context.results
		).value;
		let op;
		if (message.actionName === ActionName.UPDATE) {
			op = this.update(message, context, cfState, proposedState.state);
		} else if (message.actionName === ActionName.SETUP) {
			op = this.setup(message, context, cfState, proposedState.state);
		} else if (message.actionName === ActionName.INSTALL) {
			op = this.install(
				message,
				context,
				cfState,
				proposedState.state,
				proposedState.cfAddr
			);
		} else if (message.actionName === ActionName.UNINSTALL) {
			op = this.uninstall(message, context, cfState, proposedState.state);
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
		if (message.clientMessage.appId === undefined) {
			// FIXME: handle more gracefully
			throw Error("update message must have appId set");
		}
		let appChannel =
			proposedUpdate[multisig].appChannels[message.clientMessage.appId];

		// TODO: ensure these members are typed instead of having to reconstruct
		// class instances
		appChannel.cfApp = new CfAppInterface(
			appChannel.cfApp.address,
			appChannel.cfApp.applyAction,
			appChannel.cfApp.resolve,
			appChannel.cfApp.getTurnTaker,
			appChannel.cfApp.isStateTerminal,
			appChannel.cfApp.abiEncoding
		);

		appChannel.terms = new Terms(
			appChannel.terms.assetType,
			appChannel.terms.limit,
			appChannel.terms.token
		);

		return new CfOpSetState(
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
		let freeBalance = proposedSetup[multisig].freeBalance;
		let nonce = freeBalance.nonce;
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
		let canon = CanonicalPeerBalance.canonicalize(
			new PeerBalance(message.clientMessage.fromAddress, 0),
			new PeerBalance(message.clientMessage.toAddress, 0)
		);
		let signingKeys = [canon.peerA.address, canon.peerB.address];
		let cfStateChannel = new CfStateChannel(
			cfState.networkContext,
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
			cfStateChannel,
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
			cfState.networkContext,
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
		return op;
	}

	uninstall(
		message: InternalMessage,
		context: Context,
		cfState: CfState,
		proposedUninstall: any
	): CfOperation {
		let multisig: Address = message.clientMessage.multisigAddress;
		let cfAddr = message.clientMessage.appId;
		if (cfAddr === undefined) {
			throw "update message must have appId set";
		}

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
