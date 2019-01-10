import { AppInstance, StateChannel } from "@counterfactual/machine";
import { AppInstanceInfo, AppState, Node } from "@counterfactual/types";
import { deepEqual } from "deep-equal";

import { NodeMessage } from "../node";
import { Store } from "../store";
import { getPeersAddressFromAppInstanceID } from "../utils";

import { ERRORS } from "./errors";
import { RequestHandler } from "./request-handler";

export async function getProposedAppInstances(
  this: RequestHandler
): Promise<Node.GetAppInstancesResult> {
  return {
    appInstances: await this.store.getProposedAppInstances()
  };
}

/**
 * Gets all installed appInstances across all of the channels open on
 * this Node.
 */
export async function getInstalledAppInstances(
  this: RequestHandler
): Promise<Node.GetAppInstancesResult> {
  const appInstances: AppInstanceInfo[] = [];
  const channels = await this.store.getAllChannels();
  for (const channel of Object.values(channels)) {
    if (channel.appInstances) {
      const nonFreeBalanceAppInstances = getNonFreeBalanceAppInstances(channel);
      const appInstanceInfos = await getAppInstanceInfoFromAppInstance(
        this.store,
        nonFreeBalanceAppInstances
      );
      appInstances.push(...Object.values(appInstanceInfos));
    } else {
      console.log(
        `No app instances exist for channel with multisig address: ${
          channel.multisigAddress
        }`
      );
    }
  }
  return {
    appInstances
  };
}

/**
 * Handles the retrieval of an AppInstance's state.
 * @param this
 * @param params
 */
export async function handleGetAppInstanceState(
  this: RequestHandler,
  params: Node.GetStateParams
): Promise<Node.GetStateResult> {
  if (!params.appInstanceId) {
    Promise.reject(ERRORS.NO_APP_INSTANCE_ID_FOR_GET_STATE);
  }
  return {
    state: await getAppInstanceState(params.appInstanceId, this.store)
  };
}

/**
 * Handles taking an action on an AppInstance.
 * @param store
 * @param appInstances
 */
export async function handleTakeAction(
  this: RequestHandler,
  params: Node.TakeActionParams
): Promise<Node.TakeActionResult> {
  const { appInstanceId } = params;

  if (!appInstanceId) {
    Promise.reject(ERRORS.NO_APP_INSTANCE_ID_FOR_GET_STATE);
  }
  if (!params.action) {
    Promise.reject(ERRORS.NO_ACTION_SPECIFIED_TO_TAKE);
  }

  const updatedStateChannel = await takeAction(this.store, params);
  await this.store.updateChannelWithAppInstanceUpdate(updatedStateChannel);

  const newState = updatedStateChannel.getAppInstance(
    await this.store.getAppInstanceIdentityHashFromAppInstanceId(
      params.appInstanceId
    )
  ).state;

  const [peerAddress] = await getPeersAddressFromAppInstanceID(
    this.selfAddress,
    this.store,
    appInstanceId
  );

  const stateUpdateMsg: NodeMessage = {
    from: this.selfAddress,
    event: Node.EventName.UPDATE_STATE,
    data: {
      params,
      newState
    }
  };

  await this.messagingService.send(peerAddress, stateUpdateMsg);

  return {
    newState
  };
}

/**
 * Updates the state of an AppInstance given a state update from a peer Node.
 * @param this
 * @param msg
 */
export async function updateAppInstanceStateFromPeerNode(
  this: RequestHandler,
  msg: NodeMessage
) {
  const params: Node.TakeActionParams = msg.data.params;
  const { appInstanceId } = params;
  const newPeerState = msg.data.newState;

  if (!appInstanceId) {
    console.error(ERRORS.NO_APP_INSTANCE_ID_FOR_INCOMING_STATE_UPDATE);
    return;
  }

  if (!newPeerState) {
    console.error(ERRORS.NO_UPDATED_STATE_SUPPLIED);
    return;
  }

  const updatedStateChannel = await takeAction(this.store, params);
  const newState = updatedStateChannel.getAppInstance(
    await this.store.getAppInstanceIdentityHashFromAppInstanceId(
      params.appInstanceId
    )
  ).state;

  if (!deepEqual(newState, newPeerState)) {
    console.error(ERRORS.INVALID_UPDATED_STATE_SUPPLIED);
  }
  await this.store.updateChannelWithAppInstanceUpdate(updatedStateChannel);
}

async function getAppInstanceInfoFromAppInstance(
  store: Store,
  appInstances: AppInstance[]
): Promise<AppInstanceInfo[]> {
  return await Promise.all(
    appInstances.map<Promise<AppInstanceInfo>>(
      async (appInstance: AppInstance): Promise<AppInstanceInfo> => {
        const appInstanceId = await store.getAppInstanceIDFromAppInstanceIdentityHash(
          appInstance.identityHash
        );
        return await store.getAppInstanceInfo(appInstanceId);
      }
    )
  );
}

function getNonFreeBalanceAppInstances(
  stateChannel: StateChannel
): AppInstance[] {
  return [...stateChannel.appInstances.values()].filter(
    (appInstance: AppInstance) =>
      !stateChannel.appInstanceIsFreeBalance(appInstance.identityHash)
  );
}

/**
 * Retrieves the state of the specified AppInstance.
 * @param appInstanceId
 * @param store
 */
export async function getAppInstanceState(
  appInstanceId: string,
  store: Store
): Promise<AppState> {
  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);
  if (!stateChannel) {
    return Promise.reject(ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID);
  }
  return stateChannel.getAppInstance(
    await store.getAppInstanceIdentityHashFromAppInstanceId(appInstanceId)
  ).state;
}

/**
 *
 * @param store
 * @param params
 */
async function takeAction(
  store: Store,
  params: Node.TakeActionParams
): Promise<StateChannel> {
  const stateChannel = await store.getChannelFromAppInstanceID(
    params.appInstanceId
  );
  if (!stateChannel) {
    return Promise.reject(ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID);
  }

  const appInstanceIdentityHash = await store.getAppInstanceIdentityHashFromAppInstanceId(
    params.appInstanceId
  );
  const updatedStateChannel = stateChannel.setState(
    appInstanceIdentityHash,
    params.action
  );

  return updatedStateChannel;
}
