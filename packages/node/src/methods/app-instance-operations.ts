import { AppInstance, StateChannel } from "@counterfactual/machine";
import { AppInstanceInfo, AppState, Node } from "@counterfactual/types";

import { Store } from "../store";

import { ERRORS } from "./errors";
import { RequestHandler } from "../request-handler";

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
  const channel = await store.getChannelFromAppInstanceID(appInstanceId);
  if (!channel) {
    return Promise.reject(ERRORS.NO_MULTISIG_FOR_APP_INSTANCE_ID);
  }
  return channel.getAppInstance(
    await store.getAppInstanceIdentityHashFromAppInstanceId(appInstanceId)
  ).state;
}
