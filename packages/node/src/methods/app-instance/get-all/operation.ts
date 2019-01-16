import { AppInstance, StateChannel } from "@counterfactual/machine";
import { AppInstanceInfo } from "@counterfactual/types";

import { Store } from "../../../store";

export async function getAppInstanceInfoFromAppInstance(
  store: Store,
  appInstances: AppInstance[]
): Promise<AppInstanceInfo[]> {
  return await Promise.all(
    appInstances.map(store.getAppInstanceInfoFromAppInstance.bind(store))
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
