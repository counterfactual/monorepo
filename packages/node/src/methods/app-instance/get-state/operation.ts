import { AppState } from "@counterfactual/types";

import { Store } from "../../../store";
import { ERRORS } from "../../errors";

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
