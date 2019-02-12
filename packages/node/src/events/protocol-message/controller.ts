import { Protocol, StateChannel } from "@counterfactual/machine";
import { UninstallVirtualAppParams } from "@counterfactual/machine/dist/src/types";

import { RequestHandler } from "../../request-handler";
import {
  NODE_EVENTS,
  NodeMessageWrappedProtocolMessage,
  UninstallMessage
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
  }
}
