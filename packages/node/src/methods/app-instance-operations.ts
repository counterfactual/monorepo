import { InstructionExecutor } from "@counterfactual/machine";
import { Node } from "@counterfactual/types";

import { Channels } from "../channels";
import { APP_INSTANCE_STATUS } from "../models";
import { IMessagingService } from "../services";

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
  instructionExecutor: InstructionExecutor,
  params: Node.GetAppInstancesParams
): Promise<Node.GetAppInstancesResult> {
  return {
    appInstances: await channels.getAppInstances(APP_INSTANCE_STATUS.PROPOSED)
  };
}
