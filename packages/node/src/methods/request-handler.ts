import { Node } from "@counterfactual/common-types";
import EventEmitter from "eventemitter3";

import { Channels } from "../channels";
import { NodeMessage } from "../node";
import { IMessagingService } from "../service-interfaces";

import {
  getInstalledAppInstances,
  getProposedAppInstances
} from "./app-instances";
import { addAppInstance, install, proposeInstall } from "./installations";
import {
  addMultisig,
  createMultisig,
  getChannelAddresses
} from "./multisig-creation";

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
    this.registerEvents();
  }

  /**
   * This enables directly calling a specified method, instead of registering
   * a callback for it.
   * @param method
   * @param req
   */
  public async call(
    method: string,
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
   * as described at https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#node-protocol
   *
   * The responses to these calls are the events being listened on
   * https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#events
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
   */
  private mapEventHandlers() {
    this.events.set(Node.EventName.MULTISIG_CREATED, addMultisig);
    this.events.set(Node.EventName.INSTALL, addAppInstance);
  }

  private registerEvents() {
    this.mapEventHandlers();
    this.events.forEach((eventHandler: Function, eventName: string) => {
      this.outgoing.on(eventName, async (msg: NodeMessage) => {
        await eventHandler(this.channels, this.messagingService, msg);
      });
    });
  }
}
