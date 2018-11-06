import * as cf from "@counterfactual/cf.js";

import { CfState, Context, StateChannelInfoImpl } from "../../state";
import { InternalMessage, StateProposal } from "../../types";

export class UninstallProposer {
  public static propose(
    message: InternalMessage,
    context: Context,
    state: CfState
  ): StateProposal {
    const multisig: cf.utils.Address = message.clientMessage.multisigAddress;
    const channels = state.stateChannelInfosCopy();
    const appId = message.clientMessage.appId;
    if (appId === undefined) {
      throw new Error("uninstall message must have appId set");
    }
    // delete the app by bumping the nonce
    channels[multisig].appChannels[appId].dependencyNonce.nonceValue += 1;
    channels[multisig].appChannels[appId].dependencyNonce.isSet = true;
    // add balance and update nonce
    const canon = cf.utils.CanonicalPeerBalance.canonicalize(
      message.clientMessage.data.peerAmounts[0],
      message.clientMessage.data.peerAmounts[1]
    );
    const oldFreeBalance = channels[multisig].freeBalance;
    const newFreeBalance = new cf.utils.CfFreeBalance(
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
      chan.appChannels,
      newFreeBalance
    );
    return { state: channels };
  }
}
