import { legacy } from "@counterfactual/cf.js";

import { Node, StateChannelInfoImpl } from "../../node";
import { InternalMessage, StateProposal } from "../../types";

export class UninstallProposer {
  public static propose(message: InternalMessage, node: Node): StateProposal {
    const multisigAddress = message.clientMessage.multisigAddress;

    const channels = node.stateChannelInfosCopy();

    const appId = message.clientMessage.appInstanceId;

    if (appId === undefined) {
      throw new Error("uninstall message must have appId set");
    }

    // delete the app by bumping the nonce
    channels[multisigAddress].appInstances[
      appId
    ].dependencyNonce.nonceValue += 1;

    channels[multisigAddress].appInstances[appId].dependencyNonce.isSet = true;

    // add balance and update nonce
    const canon = legacy.utils.CanonicalPeerBalance.canonicalize(
      message.clientMessage.data.peerAmounts[0],
      message.clientMessage.data.peerAmounts[1]
    );

    const oldFreeBalance = channels[multisigAddress].freeBalance;

    const newFreeBalance = new legacy.utils.FreeBalance(
      oldFreeBalance.alice,
      oldFreeBalance.aliceBalance.add(canon.peerA.balance),
      oldFreeBalance.bob,
      oldFreeBalance.bobBalance.add(canon.peerB.balance),
      oldFreeBalance.uniqueId,
      oldFreeBalance.localNonce + 1,
      oldFreeBalance.timeout,
      oldFreeBalance.dependencyNonce
    );

    const channel = channels[multisigAddress];

    // now replace the state channel with a newly updated one
    channels[multisigAddress] = new StateChannelInfoImpl(
      channel.counterParty,
      channel.me,
      multisigAddress,
      channel.appInstances,
      newFreeBalance
    );

    // TODO: we should remove it right?
    delete channels[multisigAddress].appInstances[appId];

    return { state: channels };
  }
}
