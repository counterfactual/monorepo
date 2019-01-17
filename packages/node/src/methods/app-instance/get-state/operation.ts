import { AppState } from "@counterfactual/types";

import { Store } from "../../../store";

export async function getAppInstanceState(
  appInstanceId: string,
  store: Store
): Promise<AppState> {
  const appInstance = await store.getAppInstanceFromAppInstanceID(
    appInstanceId
  );

  return appInstance.decodeState(appInstance.encodedLatestState);
}
