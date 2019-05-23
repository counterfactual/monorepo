import { NetworkContext, Node } from "@counterfactual/types";
import { Signer } from "ethers";
import { BaseProvider, JsonRpcProvider } from "ethers/providers";
import EventEmitter from "eventemitter3";
import Queue from "p-queue";

import {
  eventNameToImplementation,
  methodNameToImplementation
} from "./api-router";
import { InstructionExecutor } from "./machine";
import { IMessagingService, IStoreService } from "./services";
import { Store } from "./store";
import { NODE_EVENTS, NodeEvents, NodeMessage } from "./types";

/**
 * This class registers handlers for requests to get or set some information
 * about app instances and channels for this Node and any relevant peer Nodes.
 */
export class RequestHandler {
  private methods = new Map();
  private events = new Map();
  private shardedQueues = new Map<string, Queue>();

  store: Store;

  constructor(
    readonly publicIdentifier: string,
    readonly incoming: EventEmitter,
    readonly outgoing: EventEmitter,
    readonly storeService: IStoreService,
    readonly messagingService: IMessagingService,
    readonly instructionExecutor: InstructionExecutor,
    readonly networkContext: NetworkContext,
    readonly provider: BaseProvider,
    readonly wallet: Signer,
    storeKeyPrefix: string,
    readonly blocksNeededForConfirmation: number
  ) {
    this.store = new Store(storeService, storeKeyPrefix);
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
    return {
      type: req.type,
      requestId: req.requestId,
      result: await this.methods.get(method)(this, req.params)
    };
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
        this.outgoing.emit(req.type, res);
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
  public async callEvent(event: NodeEvents, msg: NodeMessage) {
    const controllerExecutionMethod = this.events.get(event);

    if (!controllerExecutionMethod) {
      throw new Error(`Recent ${event} which has no event handler`);
    }

    await controllerExecutionMethod(this, msg);
  }

  public getShardedQueue(shardKey: string): Queue {
    let shardedQueue: Queue;
    if (!this.shardedQueues.has(shardKey)) {
      shardedQueue = new Queue({ concurrency: 1 });
      this.shardedQueues.set(shardKey, shardedQueue);
    }
    return this.shardedQueues.get(shardKey)!;
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
      throw e;
    }
  }

  public async getSignerAddress(): Promise<string> {
    const signer = await this.getSigner();
    return await signer.getAddress();
  }
}
