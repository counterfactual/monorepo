import * as cf from "@counterfactual/cf.js";

import { Context } from "../../instruction-executor";
import { Node, StateChannelInfoImpl } from "../../node";
import { InternalMessage, StateProposal } from "../../types";

export class UninstallProposer {
  public static propose(
    message: InternalMessage,
    context: Context,
    node: Node
  ): StateProposal {
    const multisig: cf.legacy.utils.Address =
      message.clientMessage.multisigAddress;
    const channels = node.stateChannelInfosCopy();
    const appId = message.clientMessage.appId;
    if (appId === undefined) {
      throw new Error("uninstall message must have appId set");
    }
    // delete the app by bumping the nonce
    channels[multisig].appInstances[appId].dependencyNonce.nonceValue += 1;
    channels[multisig].appInstances[appId].dependencyNonce.isSet = true;
    // add balance and update nonce
    const canon = cf.legacy.utils.CanonicalPeerBalance.canonicalize(
      message.clientMessage.data.peerAmounts[0],
      message.clientMessage.data.peerAmounts[1]
    );
    const oldFreeBalance = channels[multisig].freeBalance;
    const newFreeBalance = new cf.legacy.utils.FreeBalance(
      oldFreeBalance.alice,
      oldFreeBalance.aliceBalance.add(canon.peerA.balance),
      oldFreeBalance.bob,
      oldFreeBalance.bobBalance.add(canon.peerB.balance),
      oldFreeBalance.uniqueId,
      oldFreeBalance.localNonce + 1,
      oldFreeBalance.timeout,
      oldFreeBalance.dependencyNonce
    );
    const chan = channels[multisig];
    // now replace the state channel with a newly updated one
    channels[multisig] = new StateChannelInfoImpl(
      chan.counterParty,
      chan.me,
      multisig,
      chan.appInstances,
      newFreeBalance
    );
    return { state: channels };
  }
}
