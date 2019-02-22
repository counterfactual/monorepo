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

  console.log(`adding run protocol to the queue now`);

  await requestHandler.getShardedQueue("rootQueue").add(async () => {
    console.log(
      `----------------- beofre ${nodeMsg.data.protocol} -------------------`
    );
    console.log(
      JSON.stringify(
        Object.values(await requestHandler.store.getAllChannels()).map(x => [
          x.multisigAddress,
          x.numInstalledApps
        ]),
        null,
        2
      )
    );

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

    console.log(
      `----------------- after ${nodeMsg.data.protocol} -------------------`
    );
    console.log(
      JSON.stringify(
        Object.values(await requestHandler.store.getAllChannels()).map(x => [
          x.multisigAddress,
          x.numInstalledApps
        ]),
        null,
        2
      )
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
