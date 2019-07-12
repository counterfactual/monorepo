import {
  Protocol,
  SetupParams,
  TakeActionParams,
  UninstallParams,
  UninstallVirtualAppParams,
  WithdrawParams
} from "../machine";
import { StateChannel } from "../models";
import { RequestHandler } from "../request-handler";
import {
  CreateChannelMessage,
  NODE_EVENTS,
  NodeMessageWrappedProtocolMessage,
  UninstallMessage,
  UninstallVirtualMessage,
  UpdateStateMessage,
  WithdrawMessage
} from "../types";

/**
 * Forwards all received NodeMessages that are for the machine's internal
 * protocol execution directly to the instructionExecutor's message handler:
 * `runProtocolWithMessage`
 */
export async function handleReceivedProtocolMessage(
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
        const {
          targetAppIdentityHash,
          intermediaryXpub
        } = params as UninstallVirtualAppParams;
        const uninstallMsg: UninstallVirtualMessage = {
          from: publicIdentifier,
          type: NODE_EVENTS.UNINSTALL_VIRTUAL,
          data: {
            appInstanceId: targetAppIdentityHash,
            intermediaryIdentifier: intermediaryXpub
          }
        };

        await router.emit(uninstallMsg.type, uninstallMsg, "outgoing");
      } else if (protocol === Protocol.Uninstall) {
        const uninstallMsg: UninstallMessage = {
          from: publicIdentifier,
          type: NODE_EVENTS.UNINSTALL,
          data: {
            appInstanceId: (params as UninstallParams).appIdentityHash
          }
        };

        await router.emit(uninstallMsg.type, uninstallMsg, "outgoing");
      } else if (protocol === Protocol.Withdraw) {
        const withdrawMsg: WithdrawMessage = {
          from: publicIdentifier,
          type: NODE_EVENTS.WITHDRAWAL_CONFIRMED,
          data: {
            amount: (params as WithdrawParams).amount
          }
        };

        await router.emit(withdrawMsg.type, withdrawMsg, "outgoing");
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

        await router.emit(setupMsg.type, setupMsg, "outgoing");
      } else if (
        protocol === Protocol.TakeAction ||
        protocol === Protocol.Update
      ) {
        const { multisigAddress, appIdentityHash } = params as TakeActionParams;

        const sc = stateChannelsMap.get(multisigAddress) as StateChannel;

        const updateMsg: UpdateStateMessage = {
          from: publicIdentifier,
          type: NODE_EVENTS.UPDATE_STATE,
          data: {
            newState: sc.getAppInstance(appIdentityHash).state,
            appInstanceId: appIdentityHash
          }
        };

        await router.emit(updateMsg.type, updateMsg, "outgoing");
      }
    });
}
