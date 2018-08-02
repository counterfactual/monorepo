import { InternalMessage, getFirstResult } from "../../vm";
import { CfState, StateChannelInfoImpl, Context } from "../../state";
import { FreeBalance, PeerBalance } from "../../types";
import { CfNonce, zeroBytes32 } from "../cf-operation/types";

export class SetupProposer {
	static propose(message: InternalMessage, context: Context, state: CfState) {
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
}
