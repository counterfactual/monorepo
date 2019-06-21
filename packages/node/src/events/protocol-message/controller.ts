import {
  Protocol,
  SetupParams,
  UninstallVirtualAppParams,
  WithdrawParams
} from "../../machine";
import {
  AppInstanceProtocolContext,
  DirectChannelProtocolContext,
  ProtocolContext,
  VirtualChannelIntermediaryProtocolContext,
  VirtualChannelProtocolContext
} from "../../machine/types";
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
    outgoing
  } = requestHandler;

  const {
    data: { protocol, seq, params }
  } = nodeMsg;

  if (seq === -1) return;

  let returnContext: Partial<ProtocolContext> = {};

  // TODO: Use per-protocol sharding logic for fetching correct queue
  await requestHandler
    .getShardedQueue("instructionExecutorCoreQueue")
    .add(async () => {
      returnContext = await instructionExecutor.runProtocolWithMessage(
        nodeMsg.data,
        new Map<string, StateChannel>(
          Object.entries(await store.getAllChannels())
        )
      );
    });

  if (protocol === Protocol.Setup) {
    const { multisigAddress, initiatingXpub } = params as SetupParams;

    const { stateChannel } = returnContext as DirectChannelProtocolContext;

    await store.saveStateChannel(stateChannel);

    const setupMsg: CreateChannelMessage = {
      from: publicIdentifier,
      type: NODE_EVENTS.CREATE_CHANNEL,
      data: {
        multisigAddress,
        owners: stateChannel.multisigOwners,
        counterpartyXpub: initiatingXpub
      }
    };

    outgoing.emit(setupMsg.type, setupMsg);
  } else if (protocol === Protocol.Update) {
    const { appInstance } = returnContext as AppInstanceProtocolContext;

    await store.saveAppInstance(appInstance);

    console.log(
      "NOTE: Update protocol was run based on received message but no event was thrown"
    );
  } else if (protocol === Protocol.TakeAction) {
    const { appInstance } = returnContext as AppInstanceProtocolContext;

    await store.saveAppInstance(appInstance);

    const takeActionMsg: UpdateStateMessage = {
      from: publicIdentifier,
      type: NODE_EVENTS.WITHDRAWAL_CONFIRMED,
      data: {
        newState: appInstance.state,
        appInstanceId: appInstance.identityHash
      }
    };

    outgoing.emit(takeActionMsg.type, takeActionMsg);
  } else if (protocol === Protocol.Install) {
    const { stateChannel } = returnContext as DirectChannelProtocolContext;

    await store.saveStateChannel(stateChannel);

    console.log(
      "NOTE: Install protocol was run based on received message but no event was thrown"
    );
  } else if (protocol === Protocol.Uninstall) {
    const { stateChannel } = returnContext as DirectChannelProtocolContext;

    await store.saveStateChannel(stateChannel);

    console.log(
      "NOTE: Uninstall protocol was run based on received message but no event was thrown"
    );
  } else if (protocol === Protocol.Withdraw) {
    const { stateChannel } = returnContext as DirectChannelProtocolContext;

    await store.saveStateChannel(stateChannel);

    const withdrawMsg: WithdrawMessage = {
      from: publicIdentifier,
      type: NODE_EVENTS.WITHDRAWAL_CONFIRMED,
      data: {
        amount: (params as WithdrawParams).amount
      }
    };

    outgoing.emit(withdrawMsg.type, withdrawMsg);
  } else if (protocol === Protocol.InstallVirtualApp) {
    if (seq === 1) {
      const {
        stateChannelWithCounterparty,
        stateChannelWithInitiating,
        stateChannelWithResponding
      } = returnContext as VirtualChannelIntermediaryProtocolContext;

      if (stateChannelWithCounterparty) {
        await store.saveStateChannel(stateChannelWithCounterparty);
      }

      if (stateChannelWithCounterparty) {
        await store.saveStateChannel(stateChannelWithInitiating);
      }

      if (stateChannelWithCounterparty) {
        await store.saveStateChannel(stateChannelWithResponding);
      }
    } else if (seq === 2) {
      const {
        stateChannelWithCounterparty,
        stateChannelWithIntermediary
      } = returnContext as VirtualChannelProtocolContext;

      if (stateChannelWithCounterparty) {
        await store.saveStateChannel(stateChannelWithCounterparty);
      }

      if (stateChannelWithCounterparty) {
        await store.saveStateChannel(stateChannelWithIntermediary);
      }
    }

    console.log(
      "NOTE: Install virtual protocol was run based on received message but no event was thrown"
    );
  } else if (protocol === Protocol.UninstallVirtualApp) {
    if (seq === 1) {
      const {
        stateChannelWithCounterparty,
        stateChannelWithInitiating,
        stateChannelWithResponding
      } = returnContext as VirtualChannelIntermediaryProtocolContext;

      if (stateChannelWithCounterparty) {
        await store.saveStateChannel(stateChannelWithCounterparty);
      }

      if (stateChannelWithCounterparty) {
        await store.saveStateChannel(stateChannelWithInitiating);
      }

      if (stateChannelWithCounterparty) {
        await store.saveStateChannel(stateChannelWithResponding);
      }
    } else if (seq === 2) {
      const {
        stateChannelWithCounterparty,
        stateChannelWithIntermediary
      } = returnContext as VirtualChannelProtocolContext;

      if (stateChannelWithCounterparty) {
        await store.saveStateChannel(stateChannelWithCounterparty);
      }

      if (stateChannelWithCounterparty) {
        await store.saveStateChannel(stateChannelWithIntermediary);
      }
    }

    const uninstallMsg: UninstallMessage = {
      from: publicIdentifier,
      type: NODE_EVENTS.UNINSTALL_VIRTUAL,
      data: {
        appInstanceId: (params as UninstallVirtualAppParams)
          .targetAppIdentityHash
      }
    };

    outgoing.emit(uninstallMsg.type, uninstallMsg);
  }
}
