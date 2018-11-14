import * as cf from "@counterfactual/cf.js";
import { ethers } from "ethers";

import { StateChannelInfoImpl } from "../../node";
import { InternalMessage, StateProposal } from "../../types";

const FREE_BALANCE_TIMEOUT = 100;
/**
 * UniqueId corresponds to the number of apps maintained by a particular
 * multisig. Since the free balance is the first app, its id is 0.
 */
const FREE_BALANCE_UNIQUE_ID = 0;

/**
 * Similar to the unique id, the dependency nonce for every app is
 * determined Hash(multisig || salt), and so for the salt, we use a
 * counter on the number of apps associated with the multisig. For the
 * free balance this number is 0.
 */
export class SetupProposer {
  public static propose(message: InternalMessage): StateProposal {
    const toAddress = message.clientMessage.toAddress;
    const fromAddress = message.clientMessage.fromAddress;

    const balances = cf.legacy.utils.PeerBalance.balances(
      toAddress,
      ethers.utils.bigNumberify(0),
      fromAddress,
      ethers.utils.bigNumberify(0)
    );
    const localNonce = 0;
    const freeBalance = new cf.legacy.utils.FreeBalance(
      balances.peerA.address,
      balances.peerA.balance,
      balances.peerB.address,
      balances.peerB.balance,
      FREE_BALANCE_UNIQUE_ID,
      localNonce,
      FREE_BALANCE_TIMEOUT,
      new cf.legacy.utils.Nonce(false, FREE_BALANCE_UNIQUE_ID, 0)
    );
    const stateChannel = new StateChannelInfoImpl(
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
