import { AppInstance, StateChannel } from "@counterfactual/machine";
import { AppInstanceInfo, Node } from "@counterfactual/types";

import { Store } from "../store";

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
      const nonFreeBalanceAppInstances = getNonFreeBalanceAppInstancesJSON(
        channel
      );
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

function getNonFreeBalanceAppInstancesJSON(
  stateChannel: StateChannel
): AppInstance[] {
  return [...stateChannel.appInstances.values()].filter(
    (appInstance: AppInstance) => {
      return !stateChannel.appInstanceIsFreeBalance(appInstance.identityHash);
    }
  );
}
