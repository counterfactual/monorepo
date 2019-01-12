import { AppInstanceInfo, Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";

import {
  getAppInstanceInfoFromAppInstance,
  getNonFreeBalanceAppInstances
} from "./operation";

/**
 * Gets all installed appInstances across all of the channels open on
 * this Node.
 */
export default async function getInstalledAppInstancesController(
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
