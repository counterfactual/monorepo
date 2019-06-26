import {
  Protocol,
  SetupParams,
  TakeActionParams,
  UninstallVirtualAppParams,
  WithdrawParams
} from "../../machine";
import { StateChannel } from "../../models";
import { RequestHandler } from "../../request-handler";
import {
  CreateChannelMessage,
  NODE_EVENTS,
  NodeMessageWrappedProtocolMessage,
  UninstallMessage,
  UpdateStateMessage,
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
  const {
    publicIdentifier,
    instructionExecutor,
    store,
    router
  } = requestHandler;

  const {
    data: { protocol, seq, params }
  } = nodeMsg;

  if (seq === -1) return;

  await requestHandler
    .getShardedQueue("instructionExecutorCoreQueue")
    .add(async () => {
      const stateChannelsMap = await instructionExecutor.runProtocolWithMessage(
        nodeMsg.data,
        new Map<string, StateChannel>(
          Object.entries(await store.getAllChannels())
        )
      );

      stateChannelsMap.forEach(
        async stateChannel => await store.saveStateChannel(stateChannel)
      );

      // TODO: Follow this pattern for all machine related events
      if (protocol === Protocol.UninstallVirtualApp) {
        const uninstallMsg: UninstallMessage = {
          from: publicIdentifier,
          type: NODE_EVENTS.UNINSTALL_VIRTUAL,
          data: {
            appInstanceId: (params as UninstallVirtualAppParams)
              .targetAppIdentityHash
          }
        };

        router.emit(uninstallMsg.type, uninstallMsg, "outgoing");
      } else if (protocol === Protocol.Withdraw) {
        const withdrawMsg: WithdrawMessage = {
          from: publicIdentifier,
          type: NODE_EVENTS.WITHDRAWAL_CONFIRMED,
          data: {
            amount: (params as WithdrawParams).amount
          }
        };

        router.emit(withdrawMsg.type, withdrawMsg, "outgoing");
      } else if (protocol === Protocol.Setup) {
        const { multisigAddress, initiatingXpub } = params as SetupParams;
        const setupMsg: CreateChannelMessage = {
          from: publicIdentifier,
          type: NODE_EVENTS.CREATE_CHANNEL,
          data: {
            multisigAddress,
            owners: (stateChannelsMap.get(multisigAddress) as StateChannel)
              .multisigOwners,
            counterpartyXpub: initiatingXpub
          }
        };

        router.emit(setupMsg.type, setupMsg, "outgoing");
      } else if (protocol === Protocol.TakeAction) {
        const { multisigAddress, appIdentityHash } = params as TakeActionParams;
        const sc = stateChannelsMap.get(multisigAddress) as StateChannel;
        const appInstance = sc.getAppInstance(appIdentityHash);
        const takeActionMsg: UpdateStateMessage = {
          from: publicIdentifier,
          type: NODE_EVENTS.WITHDRAWAL_CONFIRMED,
          data: {
            newState: appInstance.state,
            appInstanceId: appIdentityHash
          }
        };

        router.emit(takeActionMsg.type, takeActionMsg, "outgoing");
      }
    });
}
