import { Node } from "@counterfactual/common-types";

import { Channels } from "../channels";
import { APP_INSTANCE_STATUS } from "../models";
import { IMessagingService } from "../service-interfaces";

export async function getInstalledAppInstances(
  channels: Channels,
  messagingService: IMessagingService,
  params: Node.GetAppInstancesParams
): Promise<Node.GetAppInstancesResult> {
  return {
    appInstances: await channels.getAppInstances(APP_INSTANCE_STATUS.INSTALLED)
  };
}

export async function getProposedAppInstances(
  channels: Channels,
  messagingService: IMessagingService,
  params: Node.GetAppInstancesParams
): Promise<Node.GetAppInstancesResult> {
  return {
    appInstances: await channels.getAppInstances(APP_INSTANCE_STATUS.PROPOSED)
  };
}
