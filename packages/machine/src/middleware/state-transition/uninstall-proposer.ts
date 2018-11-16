import * as cf from "@counterfactual/cf.js";

import { Context } from "../../instruction-executor";
import { InternalMessage, StateProposal } from "../../types";

export class UninstallProposer {
  public static propose(
    message: InternalMessage,
    context: Context,
    channel: cf.legacy.channel.StateChannelInfo
  ): StateProposal {
    const updatedChannel = channel.copy();
    const appId = message.clientMessage.appId;
    if (appId === undefined) {
      throw new Error("uninstall message must have appId set");
    }
    // Incrementing the nonce effectively deletes the app
    updatedChannel.appInstances[appId].dependencyNonce.nonceValue += 1;
    updatedChannel.appInstances[appId].dependencyNonce.isSet = true;
    // add balance and update nonce
    const canon = cf.legacy.utils.CanonicalPeerBalance.canonicalize(
      message.clientMessage.data.peerAmounts[0],
      message.clientMessage.data.peerAmounts[1]
    );
    const oldFreeBalance = updatedChannel.freeBalance;
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
    // now replace the state channel with a newly updated one
    const newChannel = new cf.legacy.channel.StateChannelInfoImpl(
      updatedChannel.counterParty,
      updatedChannel.me,
      updatedChannel.multisigAddress,
      updatedChannel.appInstances,
      newFreeBalance
    );
    return { channel: newChannel };
  }
}
