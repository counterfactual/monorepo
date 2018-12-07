import {
  AppInstanceInfo,
  Node as NodeTypes
} from "@counterfactual/common-types";
import EventEmitter from "eventemitter3";

import { Channels } from "./channels";

export class MethodHandler {
  private METHODS = new Map();
  constructor(
    private readonly incoming: EventEmitter,
    private readonly outgoing: EventEmitter,
    // @ts-ignore
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
      this.incoming.on(methodName, (req: NodeTypes.MethodRequest) => {
        const res: NodeTypes.MethodResponse = {
          type: req.type,
          requestId: req.requestId,
          result: method(req.params)
        };
        this.outgoing.emit(req.type, res);
      });
    });
  }

  // The following are implementations of the Node API methods, as defined here:
  // https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#public-methods

  private getAppInstances(
    params: NodeTypes.GetAppInstancesParams
  ): NodeTypes.GetAppInstancesResult {
    return {
      appInstances: [] as AppInstanceInfo[]
    };
  }

  private proposeInstall(
    params: NodeTypes.ProposeInstallParams
  ): NodeTypes.ProposeInstallResult {
    return {
      appInstanceId: "1"
    };
  }

  /**
   * This maps the Node method names to their respective methods.
   */
  private mapHandlers() {
    this.METHODS.set(
      NodeTypes.MethodName.GET_APP_INSTANCES,
      this.getAppInstances
    );
    this.METHODS.set(NodeTypes.MethodName.PROPOSE_INSTALL, this.proposeInstall);
  }
}
