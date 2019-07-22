import {
  Protocol,
  SetupParams,
  TakeActionParams,
  UninstallParams,
  UninstallVirtualAppParams,
  UpdateParams,
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
import { hashOfOrderedPublicIdentifiers } from "../utils";

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

  let stateChannelsMap;
  let uninstallMsg;

  if (protocol === Protocol.UninstallVirtualApp) {
    const {
      initiatorXpub,
      intermediaryXpub,
      responderXpub,
      targetAppIdentityHash
    } = params as UninstallVirtualAppParams;
    let channelWithIntermediary = await store.getMultisigAddressFromOwnersHash(
      hashOfOrderedPublicIdentifiers([initiatorXpub, intermediaryXpub])
    );

    if (channelWithIntermediary === null) {
      channelWithIntermediary = await store.getMultisigAddressFromOwnersHash(
        hashOfOrderedPublicIdentifiers([responderXpub, intermediaryXpub])
      );
    }

    await requestHandler
      .getShardedQueue(channelWithIntermediary)
      .add(async () => {
        stateChannelsMap = await instructionExecutor.runProtocolWithMessage(
          nodeMsg.data,
          new Map<string, StateChannel>(
            Object.entries(await store.getAllChannels())
          )
        );

        stateChannelsMap.forEach(
          async stateChannel => await store.saveStateChannel(stateChannel)
        );
      });

    uninstallMsg = {
      from: publicIdentifier,
      type: NODE_EVENTS.UNINSTALL_VIRTUAL,
      data: {
        appInstanceId: targetAppIdentityHash,
        intermediaryIdentifier: intermediaryXpub
      }
    } as UninstallVirtualMessage;

    await router.emit(uninstallMsg.type, uninstallMsg, "outgoing");
  } else {
    const { multisigAddress } = params as
      | UninstallParams
      | WithdrawParams
      | SetupParams
      | TakeActionParams
      | UpdateParams;

    await requestHandler.getShardedQueue(multisigAddress).add(async () => {
      stateChannelsMap = await instructionExecutor.runProtocolWithMessage(
        nodeMsg.data,
        new Map<string, StateChannel>(
          Object.entries(await store.getAllChannels())
        )
      );

      stateChannelsMap.forEach(
        async stateChannel => await store.saveStateChannel(stateChannel)
      );
    });

    switch (protocol) {
      case Protocol.Uninstall:
        uninstallMsg = {
          from: publicIdentifier,
          type: NODE_EVENTS.UNINSTALL,
          data: {
            appInstanceId: (params as UninstallParams).appIdentityHash
          }
        } as UninstallMessage;

        await router.emit(uninstallMsg.type, uninstallMsg, "outgoing");
        break;

      case Protocol.Withdraw:
        const withdrawMsg: WithdrawMessage = {
          from: publicIdentifier,
          type: NODE_EVENTS.WITHDRAWAL_CONFIRMED,
          data: {
            amount: (params as WithdrawParams).amount
          }
        };

        await router.emit(withdrawMsg.type, withdrawMsg, "outgoing");
        break;

      case Protocol.Setup:
        const { initiatorXpub } = params as SetupParams;
        const setupMsg: CreateChannelMessage = {
          from: publicIdentifier,
          type: NODE_EVENTS.CREATE_CHANNEL,
          data: {
            multisigAddress,
            owners: (stateChannelsMap.get(multisigAddress) as StateChannel)
              .multisigOwners,
            counterpartyXpub: initiatorXpub
          }
        };

        await router.emit(setupMsg.type, setupMsg, "outgoing");
        break;

      case Protocol.TakeAction:
      case Protocol.Update:
        const { appIdentityHash } = params as TakeActionParams;

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
  }
}
