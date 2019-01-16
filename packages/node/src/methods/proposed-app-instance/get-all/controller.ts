import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";

export default async function getProposedAppInstancesController(
  requestHandler: RequestHandler
): Promise<Node.GetAppInstancesResult> {
  return {
    appInstances: await requestHandler.store.getProposedAppInstances()
  };
}
