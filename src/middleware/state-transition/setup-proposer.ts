import { getFirstResult } from "../../vm";
import { CfState, StateChannelInfoImpl, Context } from "../../state";
import { PeerBalance, InternalMessage, StateProposal } from "../../types";
import { CfFreeBalance, CfNonce, zeroBytes32 } from "../cf-operation/types";
import * as ethers from "ethers";

const FREE_BALANCE_TIMEOUT = 100;
/**
 * UniqueId corresponds to the number of apps maintained by a particular
 * multisig. Since the free balance is the first app, it's id is 0.
 */
const FREE_BALANCE_UNIQUE_ID = 0;
/**
 * Similar to the unique id, the dependency nonce for every app is
 * determined Hash(multisig || salt), and so for the salt, we use a
 * counter on the number of apps associated with the multisig. For the
 * free balance this number is 0.
 */
export class SetupProposer {
	static propose(message: InternalMessage): StateProposal {
		let toAddress = message.clientMessage.toAddress;
		let fromAddress = message.clientMessage.fromAddress;

		let balances = PeerBalance.balances(toAddress, 0, fromAddress, 0);
		let localNonce = 0;
		let freeBalance = new CfFreeBalance(
			balances.peerA.address,
			balances.peerA.balance,
			balances.peerB.address,
			balances.peerB.balance,
			localNonce,
			FREE_BALANCE_UNIQUE_ID,
			FREE_BALANCE_TIMEOUT,
			new CfNonce(FREE_BALANCE_UNIQUE_ID)
		);
		let stateChannel = new StateChannelInfoImpl(
			toAddress,
			fromAddress,
			message.clientMessage.multisigAddress,
			{},
			freeBalance
		);
		return {
			state: {
				[String(message.clientMessage.multisigAddress)]: stateChannel
			}
		};
	}
}
