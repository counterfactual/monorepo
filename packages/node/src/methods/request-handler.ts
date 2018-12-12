import { Node } from "@counterfactual/common-types";
import EventEmitter from "eventemitter3";

import { Channels } from "../channels";
import { NodeMessage } from "../node";
import { IMessagingService } from "../service-interfaces";

import {
  getInstalledAppInstances,
  getProposedAppInstances
} from "./app-instance-operations";
import { addAppInstance, install, proposeInstall } from "./install-operations";
import {
  addMultisig,
  createMultisig,
  getChannelAddresses
} from "./multisig-operations";

/**
 * This class registers handlers for requests to get or set some information
 * about app instances and channels for this Node and any relevant peer Nodes.
 */
export class RequestHandler {
  private methods = new Map();
  private events = new Map();
  constructor(
    private readonly incoming: EventEmitter,
    private readonly outgoing: EventEmitter,
    private readonly channels: Channels,
    private readonly messagingService: IMessagingService
  ) {
    this.registerMethods();
    this.mapEventHandlers();
  }

  /**
   * In some use cases, waiting for the response of a method call is easier
   * and cleaner than wrangling through callback hell.
   * @param method
   * @param req
   */
  public async callMethod(
    method: Node.MethodName,
    req: Node.MethodRequest
  ): Promise<Node.MethodResponse> {
    return {
      type: req.type,
      requestId: req.requestId,
      result: await this.methods.get(method)(
        this.channels,
        this.messagingService,
        req.params
      )
    };
  }

  /**
   * This maps the Node method names to their respective handlers.
   */
  private mapMethodHandlers() {
    this.methods.set(Node.MethodName.CREATE_MULTISIG, createMultisig);
    this.methods.set(
      Node.MethodName.GET_CHANNEL_ADDRESSES,
      getChannelAddresses
    );
    this.methods.set(
      Node.MethodName.GET_APP_INSTANCES,
      getInstalledAppInstances
    );
    this.methods.set(
      Node.MethodName.GET_PROPOSED_APP_INSTANCES,
      getProposedAppInstances
    );
    this.methods.set(Node.MethodName.PROPOSE_INSTALL, proposeInstall);
    this.methods.set(Node.MethodName.INSTALL, install);
  }

  /**
   * This registers all of the methods the Node is expected to have
   * as described at https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#public-methods
   *
   */
  private registerMethods() {
    this.mapMethodHandlers();
    this.methods.forEach((method: Function, methodName: string) => {
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
   *
   * These are the events being listened on to detect requests from peer Nodes.
   * https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#events
   */
  private mapEventHandlers() {
    this.events.set(Node.EventName.MULTISIG_CREATED, addMultisig);
    this.events.set(Node.EventName.INSTALL, addAppInstance);
  }

  /**
   * This is internally called when an event is received from a peer Node.
   * Node consumers can separately setup their own callbacks for incoming events.
   * @param event
   * @param msg
   */
  public async callEvent(event: Node.EventName, msg: NodeMessage) {
    await this.events.get(event)(this.channels, this.messagingService, msg);
  }
}
