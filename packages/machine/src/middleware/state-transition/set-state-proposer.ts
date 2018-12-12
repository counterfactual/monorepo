import { legacy } from "@counterfactual/cf.js";

import { Node } from "../../node";
import { InternalMessage, StateProposal } from "../../types";

export class SetStateProposer {
  public static propose(message: InternalMessage, node: Node): StateProposal {
    const multisig = message.clientMessage.multisigAddress;

    const channels = node.stateChannelInfosCopy();

    if (message.clientMessage.appInstanceId === undefined) {
      throw new Error("update message must have appId set");
    }

    const appId: legacy.utils.H256 = message.clientMessage.appInstanceId;
    const updateData: legacy.app.UpdateData = message.clientMessage.data;

    const app = channels[multisig].appInstances[appId];
    app.appStateHash = updateData.appStateHash;
    app.encodedState = updateData.encodedAppState;
    app.localNonce += 1;

    return { state: channels };
  }
}
