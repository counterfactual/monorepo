import * as cf from "@counterfactual/cf.js";

import { State, Context } from "../../state";
import { InternalMessage, StateProposal } from "../../types";

export class UpdateProposer {
  public static propose(
    message: InternalMessage,
    context: Context,
    state: State
  ): StateProposal {
    const multisig: cf.utils.Address = message.clientMessage.multisigAddress;
    const channels = state.stateChannelInfosCopy();

    if (message.clientMessage.appId === undefined) {
      throw new Error("update message must have appId set");
    }

    const appId: cf.utils.H256 = message.clientMessage.appId;
    const updateData: cf.app.UpdateData = message.clientMessage.data;

    const app = channels[multisig].appChannels[appId];
    app.appStateHash = updateData.appStateHash;
    app.encodedState = updateData.encodedAppState;
    app.localNonce += 1;

    return { state: channels };
  }
}
