import { StateChannel } from "@counterfactual/machine";

import { RequestHandler } from "../../request-handler";
import { NodeMessageWrappedProtocolMessage } from "../../types";

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
}
