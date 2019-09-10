import { NetworkContext, SolidityValueType } from "@counterfactual/types";

import {
  InstallParams,
  InstallVirtualAppParams,
  Protocol,
  SetupParams,
  TakeActionParams,
  UninstallParams,
  UninstallVirtualAppParams,
  UpdateParams,
  WithdrawParams
} from "../machine";
import { ProtocolParameters } from "../machine/types";
import { NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID } from "../methods/errors";
import { StateChannel } from "../models";
import { UNASSIGNED_SEQ_NO } from "../protocol/utils/signature-forwarder";
import { RequestHandler } from "../request-handler";
import RpcRouter from "../rpc-router";
import { NODE_EVENTS, NodeMessageWrappedProtocolMessage } from "../types";
import { bigNumberifyJson, getCreate2MultisigAddress } from "../utils";

/**
 * Forwards all received NodeMessages that are for the machine's internal
 * protocol execution directly to the protocolRunner's message handler:
 * `runProtocolWithMessage`
 */
export async function handleReceivedProtocolMessage(
  requestHandler: RequestHandler,
  msg: NodeMessageWrappedProtocolMessage
) {
  const {
    publicIdentifier,
    protocolRunner,
    store,
    lockService,
    router,
    networkContext
  } = requestHandler;

  const { data } = bigNumberifyJson(msg) as NodeMessageWrappedProtocolMessage;

  const { protocol, seq, params } = data;

  if (seq === UNASSIGNED_SEQ_NO) return;

  const queueNames = await getQueueNamesListByProtocolName(
    protocol,
    params!,
    requestHandler
  );

  const postProtocolStateChannelsMap = await requestHandler.processQueue.addTask(
    protocol,
    publicIdentifier,
    queueNames,
    async () => {
      const preProtocolStateChannelsMap = await store.getStateChannelsMap();

      const stateChannelsMap = await protocolRunner.runProtocolWithMessage(
        data,
        preProtocolStateChannelsMap
      );

      for (const stateChannel of stateChannelsMap.values()) {
        await store.saveStateChannel(stateChannel);
      }

      return stateChannelsMap;
    },
    lockService
  );

  const outgoingEventData = getOutgoingEventDataFromProtocol(
    protocol,
    params!,
    publicIdentifier,
    postProtocolStateChannelsMap,
    networkContext
  );

  if (
    outgoingEventData &&
    (protocol === Protocol.Install || protocol === Protocol.InstallVirtualApp)
  ) {
    const appInstanceId = outgoingEventData!.data["appInstanceId"];
    if (appInstanceId) {
      let proposal;
      try {
        proposal = await store.getAppInstanceProposal(appInstanceId);
      } catch (e) {
        if (
          !e
            .toString()
            .includes(
              NO_PROPOSED_APP_INSTANCE_FOR_APP_INSTANCE_ID(appInstanceId)
            )
        ) {
          throw e;
        }
      }
      if (proposal) {
        await store.saveRealizedProposedAppInstance(proposal);
      }
    }
  }

  if (outgoingEventData) {
    await emitOutgoingNodeMessage(router, outgoingEventData);
  }
}

function emitOutgoingNodeMessage(router: RpcRouter, msg: object) {
  return router.emit(msg["type"], msg, "outgoing");
}

function getOutgoingEventDataFromProtocol(
  protocol: string,
  params: ProtocolParameters,
  publicIdentifier: string,
  stateChannelsMap: Map<string, StateChannel>,
  networkContext: NetworkContext
) {
  const baseEvent = { from: publicIdentifier };

  switch (protocol) {
    case Protocol.Install:
      return {
        ...baseEvent,
        type: NODE_EVENTS.INSTALL,
        data: {
          // TODO: It is weird that `params` is in the event data, we should
          // remove it, but after telling all consumers about this change
          params: {
            appInstanceId: stateChannelsMap
              .get(
                getCreate2MultisigAddress(
                  [params.responderXpub, params.initiatorXpub],
                  networkContext.ProxyFactory,
                  networkContext.MinimumViableMultisig
                )
              )!
              .mostRecentlyInstalledAppInstance().identityHash
          }
        }
      };
    case Protocol.Uninstall:
      return {
        ...baseEvent,
        type: NODE_EVENTS.UNINSTALL,
        data: getUninstallEventData(params as UninstallParams)
      };
    case Protocol.Setup:
      return {
        ...baseEvent,
        type: NODE_EVENTS.CREATE_CHANNEL,
        data: getSetupEventData(
          params as SetupParams,
          stateChannelsMap.get((params as SetupParams).multisigAddress)!
            .multisigOwners
        )
      };
    case Protocol.Withdraw:
      return {
        ...baseEvent,
        type: NODE_EVENTS.WITHDRAWAL_CONFIRMED,
        data: getWithdrawEventData(params as WithdrawParams)
      };
    case Protocol.TakeAction:
    case Protocol.Update:
      return {
        ...baseEvent,
        type: NODE_EVENTS.UPDATE_STATE,
        data: getStateUpdateEventData(
          params as UpdateParams,
          stateChannelsMap
            .get((params as TakeActionParams | UpdateParams).multisigAddress)!
            .getAppInstance(
              (params as TakeActionParams | UpdateParams).appIdentityHash
            )!.state
        )
      };
    case Protocol.InstallVirtualApp:
      const virtualChannel = getCreate2MultisigAddress(
        [params.responderXpub, params.initiatorXpub],
        networkContext.ProxyFactory,
        networkContext.MinimumViableMultisig
      );
      if (stateChannelsMap.has(virtualChannel)) {
        return {
          ...baseEvent,
          type: NODE_EVENTS.INSTALL_VIRTUAL,
          data: {
            // TODO: It is weird that `params` is in the event data, we should
            // remove it, but after telling all consumers about this change
            params: {
              appInstanceId: stateChannelsMap
                .get(virtualChannel)!
                .mostRecentlyInstalledAppInstance().identityHash
            }
          }
        };
      }
      return;
    case Protocol.UninstallVirtualApp:
      return {
        ...baseEvent,
        type: NODE_EVENTS.UNINSTALL_VIRTUAL,
        data: getUninstallVirtualAppEventData(
          params as UninstallVirtualAppParams
        )
      };
    default:
      throw Error(
        `handleReceivedProtocolMessage received invalid protocol message: ${protocol}`
      );
  }
}

function getStateUpdateEventData(
  { appIdentityHash: appInstanceId }: TakeActionParams | UpdateParams,
  newState: SolidityValueType
) {
  return { newState, appInstanceId };
}

function getUninstallVirtualAppEventData({
  intermediaryXpub: intermediaryIdentifier,
  targetAppIdentityHash: appInstanceId
}: UninstallVirtualAppParams) {
  return { appInstanceId, intermediaryIdentifier };
}

function getUninstallEventData({
  appIdentityHash: appInstanceId
}: UninstallParams) {
  return { appInstanceId };
}

function getWithdrawEventData({ amount }: WithdrawParams) {
  return amount;
}

function getSetupEventData(
  { initiatorXpub: counterpartyXpub, multisigAddress }: SetupParams,
  owners: string[]
) {
  return { multisigAddress, owners, counterpartyXpub };
}

/**
 * Produces an array of queues that the client must halt execution on
 * for some particular protocol and its set of parameters/
 *
 * @param {string} protocol - string name of the protocol
 * @param {ProtocolParameters} params - parameters relevant for the protocol
 * @param {Store} store - the store the client is connected to
 * @param {RequestHandler} requestHandler - the request handler object of the client
 *
 * @returns {Promise<string[]>} - list of the names of the queues
 */
async function getQueueNamesListByProtocolName(
  protocol: string,
  params: ProtocolParameters,
  requestHandler: RequestHandler
): Promise<string[]> {
  const { publicIdentifier, networkContext } = requestHandler;

  function multisigAddressFor(xpubs: string[]) {
    return getCreate2MultisigAddress(
      xpubs,
      networkContext.ProxyFactory,
      networkContext.MinimumViableMultisig
    );
  }

  switch (protocol) {
    /**
     * Queue on the multisig address of the direct channel.
     */
    case Protocol.Install:
    case Protocol.Setup:
    case Protocol.Withdraw:
      const { multisigAddress } = params as
        | InstallParams
        | SetupParams
        | WithdrawParams;

      return [multisigAddress];

    /**
     * Queue on the appInstanceId of the AppInstance.
     */
    case Protocol.TakeAction:
    case Protocol.Update:
      const { appIdentityHash } = params as TakeActionParams | UpdateParams;

      return [appIdentityHash];

    case Protocol.Uninstall:
      const {
        multisigAddress: addr,
        appIdentityHash: appInstanceId
      } = params as UninstallParams;

      return [addr, appInstanceId];

    /**
     * Queue on the multisig addresses of both direct channels involved.
     */
    case Protocol.InstallVirtualApp:
    case Protocol.UninstallVirtualApp:
      const { initiatorXpub, intermediaryXpub, responderXpub } = params as
        | UninstallVirtualAppParams
        | InstallVirtualAppParams;

      if (publicIdentifier === intermediaryXpub) {
        return [
          multisigAddressFor([initiatorXpub, intermediaryXpub]),
          multisigAddressFor([responderXpub, intermediaryXpub])
        ];
      }

      if (publicIdentifier === responderXpub) {
        return [
          multisigAddressFor([responderXpub, intermediaryXpub]),
          multisigAddressFor([responderXpub, initiatorXpub])
        ];
      }

    // NOTE: This file is only reachable if a protocol message is sent
    // from an initiator to an intermediary, an intermediary to
    // a responder, or an initiator to a responder. It is never possible
    // for the publicIdentifier to be the initiatorXpub, so we ignore
    // that case.

    default:
      throw Error(
        `handleReceivedProtocolMessage received invalid protocol message: ${protocol}`
      );
  }
}
