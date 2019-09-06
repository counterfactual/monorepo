import { AppInstanceJson, Node } from "@counterfactual/types";
import { jsonRpcMethod } from "rpc-server";

import { StateChannel } from "../../../models";
import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";

/**
 * Gets all installed appInstances across all of the channels open on
 * this Node.
 */
export default class GetAppInstancesController extends NodeController {
  @jsonRpcMethod(Node.RpcMethodName.GET_APP_INSTANCES)
  public executeMethod = super.executeMethod;

  protected async executeMethodImplementation(
    requestHandler: RequestHandler
  ): Promise<Node.GetAppInstancesResult> {
    const { store } = requestHandler;

    const channels = await store.getStateChannelsMap();

    const appInstances = Array.from(channels.values()).reduce(
      (acc: AppInstanceJson[], channel: StateChannel) => {
        acc.push(
          ...Array.from(channel.appInstances.values()).map(appInstance =>
            appInstance.toJson()
          )
        );
        return acc;
      },
      []
    );

    return {
      appInstances
    };
  }
}
