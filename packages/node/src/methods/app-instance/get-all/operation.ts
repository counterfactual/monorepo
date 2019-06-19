import { AppInstanceInfo } from "@counterfactual/types";

import { AppInstance } from "../../../models";
import { Store } from "../../../store";

export async function getAppInstanceInfoFromAppInstance(
  store: Store,
  appInstances: AppInstance[]
): Promise<AppInstanceInfo[]> {
  return await Promise.all(
    appInstances.map(x => store.getAppInstanceInfoFromAppInstance(x))
  );
}
