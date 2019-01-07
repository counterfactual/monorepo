import { Node } from "@counterfactual/types";

import { APP_INSTANCE_STATUS } from "../db-schema";

import { RequestHandler } from "./request-handler";

export async function getInstalledAppInstances(
  this: RequestHandler
): Promise<Node.GetAppInstancesResult> {
  return {
    appInstances: await this.channels.getAppInstances(
      APP_INSTANCE_STATUS.INSTALLED
    )
  };
}

export async function getProposedAppInstances(
  this: RequestHandler
): Promise<Node.GetAppInstancesResult> {
  return {
    appInstances: await this.channels.getAppInstances(
      APP_INSTANCE_STATUS.PROPOSED
    )
  };
}
