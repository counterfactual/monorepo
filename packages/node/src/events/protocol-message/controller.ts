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
  UninstallVirtualMessage,
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
    outgoing
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
      if (protocol === Protocol.Setup) {
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

        outgoing.emit(setupMsg.type, setupMsg);
      } else if (protocol === Protocol.Update) {
        console.log(
          "NOTE: Update protocol was run based on received message but no event was thrown"
        );
      } else if (protocol === Protocol.TakeAction) {
        const { multisigAddress, appIdentityHash } = params as TakeActionParams;

        const sc = stateChannelsMap.get(multisigAddress) as StateChannel;

        const takeAction: UpdateStateMessage = {
          from: publicIdentifier,
          type: NODE_EVENTS.UPDATE_STATE,
          data: {
            newState: sc.getAppInstance(appIdentityHash).state,
            appInstanceId: appIdentityHash
          }
        };

        outgoing.emit(takeAction.type, takeAction);
      } else if (protocol === Protocol.Install) {
        console.log(
          "NOTE: Install protocol was run based on received message but no event was thrown"
        );
      } else if (protocol === Protocol.Uninstall) {
        console.log(
          "NOTE: Uninstall protocol was run based on received message but no event was thrown"
        );
      } else if (protocol === Protocol.Withdraw) {
        const withdrawMsg: WithdrawMessage = {
          from: publicIdentifier,
          type: NODE_EVENTS.WITHDRAWAL_CONFIRMED,
          data: {
            amount: (params as WithdrawParams).amount
          }
        };

        outgoing.emit(withdrawMsg.type, withdrawMsg);
      } else if (protocol === Protocol.InstallVirtualApp) {
        console.log(
          "NOTE: Install virtual protocol was run based on received message but no event was thrown"
        );
      } else if (protocol === Protocol.UninstallVirtualApp) {
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

        outgoing.emit(uninstallMsg.type, uninstallMsg);
      }
    });
}
