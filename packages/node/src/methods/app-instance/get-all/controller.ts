import { AppInstanceInfo, Node } from "@counterfactual/types";
import * as log from "loglevel";
import { jsonRpcMethod } from "rpc-server";

import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";

import { getAppInstanceInfoFromAppInstance } from "./operation";
/**
 * Gets all installed appInstances across all of the channels open on
 * this Node.
 */
export default class GetAppInstancesController extends NodeController {
  public static readonly methodName = Node.MethodName.GET_APP_INSTANCES;

  @jsonRpcMethod("chan_getAppInstances")
  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.GetAppInstancesParams
  ): Promise<Node.GetAppInstancesResult> {
    const { store } = requestHandler;

    const appInstances: AppInstanceInfo[] = [];

    const channels = await store.getAllChannels();

    for (const channel of Object.values(channels)) {
      if (channel.appInstances) {
        const appInstanceInfos = await getAppInstanceInfoFromAppInstance(
          store,
          [...channel.appInstances.values()]
        );

        appInstances.push(
          // FIXME: shouldn't have to filter for null
          ...Object.values(appInstanceInfos).filter(appInstanceInfo => {
            if (appInstanceInfo === null) {
              console.warn(
                "Found null value in array of appInstanceInfos returned from DB"
              );
              return false;
            }
            return true;
          })
        );
      } else {
        log.error(
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
}
