import { StateChannel } from "@counterfactual/machine";

import { RequestHandler } from "../../request-handler";
import { NodeMessageWrappedProtocolMessage } from "../../types";

/**
 * Forwards all received NodeMessages that are for the machine's internal
 * protocol execution directly to the instructionExecutor's message handler:
 * `dispatchReceivedMessage`
 */
export default async function protocolMessageEventController(
  requestHandler: RequestHandler,
  nodeMsg: NodeMessageWrappedProtocolMessage
) {
  // FIXME: Take into account the protocols sequence length. More
  //        generally this if statement is trying to capture the notion:
  //        "do not restart a protocol if a message is received from another
  //         client mid-protocol execution (assume IO_WAIT is listening)"
  //
  //        An alternative might be that IO_WAIT is hooked onto toms event
  //        listeniner inside the instructionExecutor that emits noise
  //        when dispatchReceivedMessage receives a message for an in-progress
  //        protocol execution.
  if (nodeMsg.data.seq === 2) return;

  await requestHandler.instructionExecutor.dispatchReceivedMessage(
    nodeMsg.data,
    new Map<string, StateChannel>(
      Object.entries(await requestHandler.store.getAllChannels())
    )
  );
}
