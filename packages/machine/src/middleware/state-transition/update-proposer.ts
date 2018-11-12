import * as cf from "@counterfactual/cf.js";

import { Context } from "../../instruction-executor";
import { NodeState } from "../../node-state";
import { InternalMessage, StateProposal } from "../../types";

export class UpdateProposer {
  public static propose(
    message: InternalMessage,
    context: Context,
    nodeState: NodeState
  ): StateProposal {
    const multisig: cf.utils.Address = message.clientMessage.multisigAddress;
    const channels = nodeState.stateChannelInfosCopy();

    if (message.clientMessage.appId === undefined) {
      throw new Error("update message must have appId set");
    }

    const appId: cf.utils.H256 = message.clientMessage.appId;
    const updateData: cf.app.UpdateData = message.clientMessage.data;

    const app = channels[multisig].appInstances[appId];
    app.appStateHash = updateData.appStateHash;
    app.encodedState = updateData.encodedAppState;
    app.localNonce += 1;

    return { state: channels };
  }
}
