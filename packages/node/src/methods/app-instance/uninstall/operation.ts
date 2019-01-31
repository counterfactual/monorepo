import { StateChannel } from "@counterfactual/machine";

import { Store } from "../../../store";

export async function uninstallAppInstanceFromChannel(
  store: Store,
  appInstanceId: string
): Promise<StateChannel> {
  // TODO: this should actually call resolve on the AppInstance and execute
  // the appropriate payout to the right parties
  const channel = await store.getChannelFromAppInstanceID(appInstanceId);

  const appInstanceInfo = await store.getAppInstanceInfo(appInstanceId);

  return channel.uninstallApp(
    await store.getAppInstanceIdentityHashFromAppInstanceId(appInstanceId),
    appInstanceInfo.myDeposit,
    appInstanceInfo.peerDeposit
  );
}
