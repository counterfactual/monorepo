import * as cf from "@counterfactual/cf.js";

import { Context } from "../../instruction-executor";
import { InternalMessage, StateProposal } from "../../types";

export class UpdateProposer {
  public static propose(
    message: InternalMessage,
    context: Context,
    channel: cf.legacy.channel.StateChannelInfo
  ): StateProposal {
    const updatedChannel = channel.copy();

    if (message.clientMessage.appId === undefined) {
      throw new Error("update message must have appId set");
    }

    const appId: cf.legacy.utils.H256 = message.clientMessage.appId;
    const updateData: cf.legacy.app.UpdateData = message.clientMessage.data;

    const app = updatedChannel.appInstances[appId];
    app.appStateHash = updateData.appStateHash;
    app.encodedState = updateData.encodedAppState;
    app.localNonce += 1;

    return { channel: updatedChannel };
  }
}
