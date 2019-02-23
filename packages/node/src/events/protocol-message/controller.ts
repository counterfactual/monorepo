import { Protocol, StateChannel } from "@counterfactual/machine";
import {
  UninstallVirtualAppParams,
  WithdrawParams
} from "@counterfactual/machine/dist/src/types";

import { RequestHandler } from "../../request-handler";
import {
  NODE_EVENTS,
  NodeMessageWrappedProtocolMessage,
  UninstallMessage,
  WithdrawMessage
} from "../../types";

/**
 * Forwards all received NodeMessages that are for the machine's internal
 * protocol execution directly to the instructionExecutor's message handler:
 * `runProtocolWithMessage`
 */
export default async function protocolMessageEventController(
  requestHandler: RequestHandler,
  nodeMsg: NodeMessageWrappedProtocolMessage
) {
  if (nodeMsg.data.seq === -1) return;

  await requestHandler.getShardedQueue("rootQueue").add(async () => {
    const stateChannelsMap = await requestHandler.instructionExecutor.runProtocolWithMessage(
      nodeMsg.data,
      new Map<string, StateChannel>(
        Object.entries(await requestHandler.store.getAllChannels())
      )
    );

    stateChannelsMap.forEach(
      async stateChannel =>
        await requestHandler.store.saveStateChannel(stateChannel)
    );

    // TODO: Follow this pattern for all machine related events
    if (nodeMsg.data.protocol === Protocol.UninstallVirtualApp) {
      const uninstallMsg: UninstallMessage = {
        from: requestHandler.publicIdentifier,
        type: NODE_EVENTS.UNINSTALL_VIRTUAL,
        data: {
          appInstanceId: (nodeMsg.data.params as UninstallVirtualAppParams)
            .targetAppIdentityHash
        }
      };

      requestHandler.outgoing.emit(uninstallMsg.type, uninstallMsg);
    } else if (nodeMsg.data.protocol === Protocol.Withdraw) {
      const withdrawMsg: WithdrawMessage = {
        from: requestHandler.publicIdentifier,
        type: NODE_EVENTS.WITHDRAW,
        data: {
          amount: (nodeMsg.data.params as WithdrawParams).amount
        }
      };

      requestHandler.outgoing.emit(withdrawMsg.type, withdrawMsg);
    }
  });
}
