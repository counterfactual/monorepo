import { InstructionExecutor } from "@counterfactual/machine";
import { Node } from "@counterfactual/types";
import EventEmitter from "eventemitter3";

import { Channels } from "../channels";
import { NodeMessage } from "../node";
import { IMessagingService } from "../services";

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
    readonly incoming: EventEmitter,
    readonly outgoing: EventEmitter,
    readonly channels: Channels,
    readonly messagingService: IMessagingService,
    readonly instructionExecutor: InstructionExecutor
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
      result: await this.methods.get(method)(req.params)
    };
  }

  /**
   * This maps the Node method names to their respective handlers.
   */
  private mapMethodHandlers() {
    this.methods.set(
      Node.MethodName.CREATE_MULTISIG,
      createMultisig.bind(this)
    );
    this.methods.set(
      Node.MethodName.GET_CHANNEL_ADDRESSES,
      getChannelAddresses.bind(this)
    );
    this.methods.set(
      Node.MethodName.GET_APP_INSTANCES,
      getInstalledAppInstances.bind(this)
    );
    this.methods.set(
      Node.MethodName.GET_PROPOSED_APP_INSTANCES,
      getProposedAppInstances.bind(this)
    );
    this.methods.set(
      Node.MethodName.PROPOSE_INSTALL,
      proposeInstall.bind(this)
    );
    this.methods.set(Node.MethodName.INSTALL, install.bind(this));
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
          result: await method(req.params)
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
    this.events.set(Node.EventName.CREATE_MULTISIG, addMultisig.bind(this));
    this.events.set(Node.EventName.INSTALL, addAppInstance.bind(this));
  }

  /**
   * This is internally called when an event is received from a peer Node.
   * Node consumers can separately setup their own callbacks for incoming events.
   * @param event
   * @param msg
   */
  public async callEvent(event: Node.EventName, msg: NodeMessage) {
    await this.events.get(event)(msg);
  }
}
