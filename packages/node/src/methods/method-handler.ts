import { Node } from "@counterfactual/common-types";
import EventEmitter from "eventemitter3";

import { Channels } from "../channels";
import { NodeMessage } from "../node";
import { IMessagingService } from "../service-interfaces";

import { addAppInstance, install, proposeInstall } from "./installations";
import { addMultisig, createMultisig } from "./multisig-creation";

export class MethodHandler {
  private METHODS = new Map();
  private EVENTS = new Map();
  constructor(
    private readonly incoming: EventEmitter,
    private readonly outgoing: EventEmitter,
    private readonly channels: Channels,
    private readonly messagingService: IMessagingService
  ) {
    this.registerMethods();
    this.registerEvents();
  }

  /**
   * This maps the Node method names to their respective handlers.
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
          result: await method(this.channels, this.messagingService, req.params)
        };
        this.outgoing.emit(req.type, res);
      });
    });
  }

  /**
   * This maps the Node event names to their respective handlers.
   */
  private mapEvents() {
    this.EVENTS.set(Node.EventName.MULTISIG_CREATED, addMultisig);
    this.EVENTS.set(Node.EventName.INSTALL, addAppInstance);
  }

  private registerEvents() {
    this.mapEvents();
    this.EVENTS.forEach((eventHandler: Function, eventName: string) => {
      this.outgoing.on(eventName, async (msg: NodeMessage) => {
        await eventHandler(this.channels, this.messagingService, msg);
      });
    });
  }
}

async function getAppInstances(
  channels: Channels,
  messagingService: IMessagingService,
  params: Node.GetAppInstancesParams
): Promise<Node.GetAppInstancesResult> {
  return {
    appInstances: await channels.getAppInstances(
      Channels.APP_INSTANCE_STATUS.INSTALLED
    )
  };
}
