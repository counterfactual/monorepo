import { Node as NodeTypes } from "@counterfactual/common-types";
import EventEmitter from "eventemitter3";

import { Channels } from "./channels";

export class MethodHandler {
  private METHODS = new Map();
  constructor(
    private readonly incoming: EventEmitter,
    private readonly outgoing: EventEmitter,
    private readonly channels: Channels
  ) {
    this.registerMethods();
  }

  /**
   * This registers all of the methods the Node is expected to have
   * as described at https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#node-protocol
   *
   * The responses to these calls are the events being listened on
   * https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#events
   */
  private registerMethods() {
    this.mapHandlers();
    this.METHODS.forEach((method: Function, methodName: string) => {
      this.incoming.on(methodName, async (req: NodeTypes.MethodRequest) => {
        const res: NodeTypes.MethodResponse = {
          type: req.type,
          requestId: req.requestId,
          result: await method(this.channels, req.params)
        };
        this.outgoing.emit(req.type, res);
      });
    });
  }

  // The following are implementations of the Node API methods, as defined here:
  // https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#public-methods

  /**
   * This maps the Node method names to their respective methods.
   */
  private mapHandlers() {
    this.METHODS.set(NodeTypes.MethodName.GET_APP_INSTANCES, getAppInstances);
    this.METHODS.set(NodeTypes.MethodName.PROPOSE_INSTALL, proposeInstall);
  }
}
async function getAppInstances(
  channels: Channels,
  params: NodeTypes.GetAppInstancesParams
): Promise<NodeTypes.GetAppInstancesResult> {
  return {
    appInstances: await channels.getAllApps()
  };
}

async function proposeInstall(
  channels: Channels,
  params: NodeTypes.ProposeInstallParams
): Promise<NodeTypes.ProposeInstallResult> {
  return {
    appInstanceId: await channels.proposeInstall(params)
  };
}
