import { AppInstance, StateChannel } from "@counterfactual/machine";
import { AppInstanceInfo } from "@counterfactual/types";

import { Store } from "../../../store";

export async function getAppInstanceInfoFromAppInstance(
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

export function getNonFreeBalanceAppInstances(
  stateChannel: StateChannel
): AppInstance[] {
  return [...stateChannel.appInstances.values()].filter(
    (appInstance: AppInstance) =>
      !stateChannel.appInstanceIsFreeBalance(appInstance.identityHash)
  );
}
