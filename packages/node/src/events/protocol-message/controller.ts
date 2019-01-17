import { StateChannel } from "@counterfactual/machine";

import { RequestHandler } from "../../request-handler";
import { NodeMessageWrappedProtocolMessage } from "../../types";

/**
 * This function responds to a installation proposal approval from a peer Node
 * by counter installing the AppInstance this Node proposed earlier.
 */
export default async function protocolMessageEventController(
  requestHandler: RequestHandler,
  nodeMsg: NodeMessageWrappedProtocolMessage
) {
  await requestHandler.instructionExecutor.dispatchReceivedMessage(
    nodeMsg.data,
    new Map<string, StateChannel>(
      Object.entries(await requestHandler.store.getAllChannels())
    )
  );
}
