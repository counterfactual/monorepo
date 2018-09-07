import { getFirstResult } from "../../vm";
import { CfState, StateChannelInfoImpl, Context } from "../../state";
import {
	Address,
	CanonicalPeerBalance,
	PeerBalance,
	StateChannelInfos,
	InternalMessage,
	StateProposal
} from "../../types";
import { CfFreeBalance } from "../cf-operation/types";

export class UninstallProposer {
	static propose(
		message: InternalMessage,
		context: Context,
		state: CfState
	): StateProposal {
		let multisig: Address = message.clientMessage.multisigAddress;
		let channels = state.stateChannelInfosCopy();
		let appId = message.clientMessage.appId;
		if (appId === undefined) {
			throw "uninstall message must have appId set";
		}
		// delete the app by bumping the nonce
		channels[multisig].appChannels[appId].dependencyNonce.nonce += 1;
		// add balance and update nonce
		let canon = CanonicalPeerBalance.canonicalize(
			message.clientMessage.data.peerAmounts[0],
			message.clientMessage.data.peerAmounts[1]
		);
		let oldFreeBalance = channels[multisig].freeBalance;
		let newFreeBalance = new CfFreeBalance(
			oldFreeBalance.alice,
			oldFreeBalance.aliceBalance + canon.peerA.balance,
			oldFreeBalance.bob,
			oldFreeBalance.bobBalance + canon.peerB.balance,
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
		return { state: channels };
	}
}
