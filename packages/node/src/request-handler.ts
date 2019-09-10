import { NetworkContext, Node } from "@counterfactual/types";
import { Signer } from "ethers";
import { BaseProvider, JsonRpcProvider } from "ethers/providers";
import EventEmitter from "eventemitter3";
import log from "loglevel";

import { eventNameToImplementation, methodNameToImplementation } from "./api";
import { ProtocolRunner } from "./machine";
import ProcessQueue from "./process-queue";
import RpcRouter from "./rpc-router";
import { Store } from "./store";
import { NODE_EVENTS, NodeEvents } from "./types";
import { prettyPrintObject } from "./utils";

/**
 * This class registers handlers for requests to get or set some information
 * about app instances and channels for this Node and any relevant peer Nodes.
 */
export class RequestHandler {
  private readonly methods = new Map();
  private readonly events = new Map();
  public readonly processQueue = new ProcessQueue();

  store: Store;
  router!: RpcRouter;

  constructor(
    readonly publicIdentifier: string,
    readonly incoming: EventEmitter,
    readonly outgoing: EventEmitter,
    readonly storeService: Node.IStoreService,
    readonly messagingService: Node.IMessagingService,
    readonly protocolRunner: ProtocolRunner,
    readonly networkContext: NetworkContext,
    readonly provider: BaseProvider,
    readonly wallet: Signer,
    storeKeyPrefix: string,
    readonly blocksNeededForConfirmation: number
  ) {
    this.store = new Store(storeService, storeKeyPrefix, networkContext);
  }

  injectRouter(router: RpcRouter) {
    this.router = router;
    this.mapPublicApiMethods();
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
    const result = {
      type: req.type,
      requestId: req.requestId,
      result: await this.methods.get(method)(this, req.params)
    };

    return result;
  }

  /**
   * This registers all of the methods the Node is expected to have
   * as described at https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#public-methods
   */
  private mapPublicApiMethods() {
    for (const methodName in methodNameToImplementation) {
      this.methods.set(methodName, methodNameToImplementation[methodName]);

      this.incoming.on(methodName, async (req: Node.MethodRequest) => {
        const res: Node.MethodResponse = {
          type: req.type,
          requestId: req.requestId,
          result: await this.methods.get(methodName)(this, req.params)
        };

        // @ts-ignore
        this.router.emit(req.methodName, res, "outgoing");
      });
    }
  }

  /**
   * This maps the Node event names to their respective handlers.
   *
   * These are the events being listened on to detect requests from peer Nodes.
   * https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#events
   */
  private mapEventHandlers() {
    for (const eventName of Object.values(NODE_EVENTS)) {
      this.events.set(eventName, eventNameToImplementation[eventName]);
    }
  }

  /**
   * This is internally called when an event is received from a peer Node.
   * Node consumers can separately setup their own callbacks for incoming events.
   * @param event
   * @param msg
   */
  public async callEvent(event: NodeEvents, msg: Node.NodeMessage) {
    const controllerExecutionMethod = this.events.get(event);
    const controllerCount = this.router.eventListenerCount(event);

    if (!controllerExecutionMethod && controllerCount === 0) {
      if (event === NODE_EVENTS.DEPOSIT_CONFIRMED) {
        log.info(
          `No event handler for counter depositing into channel: ${JSON.stringify(
            msg,
            undefined,
            4
          )}`
        );
      } else {
        throw Error(`Recent ${event} which has no event handler`);
      }
    }

    if (controllerExecutionMethod) {
      await controllerExecutionMethod(this, msg);
    }

    this.router.emit(event, msg);
  }

  public async isLegacyEvent(event: NodeEvents) {
    return this.events.has(event);
  }

  public async getSigner(): Promise<Signer> {
    try {
      const signer = await (this.provider as JsonRpcProvider).getSigner();
      await signer.getAddress();
      return signer;
    } catch (e) {
      if (e.code === "UNSUPPORTED_OPERATION") {
        return this.wallet;
      }
      throw Error(prettyPrintObject(e));
    }
  }

  public async getSignerAddress(): Promise<string> {
    const signer = await this.getSigner();
    return await signer.getAddress();
  }
}
