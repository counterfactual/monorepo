import * as cf from "@counterfactual/cf.js";

import { Context } from "../../instruction-executor";
import { Node } from "../../node";
import { InternalMessage, StateProposal } from "../../types";

export class UpdateProposer {
  public static propose(
    message: InternalMessage,
    context: Context,
    node: Node
  ): StateProposal {
    const multisig: cf.legacy.utils.Address =
      message.clientMessage.multisigAddress;
    const channels = node.stateChannelInfosCopy();

    if (message.clientMessage.appId === undefined) {
      throw new Error("update message must have appId set");
    }

    const appId: cf.legacy.utils.H256 = message.clientMessage.appId;
    const updateData: cf.legacy.app.UpdateData = message.clientMessage.data;

    const app = channels[multisig].appInstances[appId];
    app.appStateHash = updateData.appStateHash;
    app.encodedState = updateData.encodedAppState;
    app.localNonce += 1;

    return { state: channels };
  }
}
