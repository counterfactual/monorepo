import { Node } from "@counterfactual/common-types";
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

  // The following are implementations of the Node API methods, as defined here:
  // https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#public-methods

  /**
   * This maps the Node method names to their respective methods.
   */
  private mapHandlers() {
    this.METHODS.set(Node.MethodName.CREATE_MULTISIG, createMultisig);
    this.METHODS.set(Node.MethodName.GET_APP_INSTANCES, getAppInstances);
    this.METHODS.set(Node.MethodName.PROPOSE_INSTALL, proposeInstall);
    this.METHODS.set(Node.MethodName.INSTALL, install);
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
      this.incoming.on(methodName, async (req: Node.MethodRequest) => {
        const res: Node.MethodResponse = {
          type: req.type,
          requestId: req.requestId,
          result: await method(this.channels, req.params)
        };
        this.outgoing.emit(req.type, res);
      });
    });
  }
}

// The following are wrappers around the methods which return the result
// of the specified operation in the context of the relevant channel.

async function createMultisig(
  channels: Channels,
  params: Node.CreateMultisigParams
): Promise<Node.CreateMultisigResult> {
  return {
    multisigAddress: await channels.createMultisig(params)
  };
}

async function getAppInstances(
  channels: Channels,
  params: Node.GetAppInstancesParams
): Promise<Node.GetAppInstancesResult> {
  return {
    appInstances: await channels.getAllApps()
  };
}

async function proposeInstall(
  channels: Channels,
  params: Node.ProposeInstallParams
): Promise<Node.ProposeInstallResult> {
  return {
    appInstanceId: await channels.proposeInstall(params)
  };
}

async function install(
  channels: Channels,
  params: Node.InstallParams
): Promise<Node.InstallResult> {
  return {
    appInstance: await channels.install(params)
  };
}
