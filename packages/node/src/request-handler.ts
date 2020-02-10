import { NetworkContext, Node } from "@counterfactual/types";
import { Signer } from "ethers";
import { JsonRpcProvider, Provider } from "ethers/providers";
import EventEmitter from "eventemitter3";

import { methodNameToImplementation } from "./api";
import { ProtocolRunner } from "./engine";
import { handleRejectProposalMessage } from "./message-handling/handle-node-message";
import { handleReceivedProtocolMessage } from "./message-handling/handle-protocol-message";
import ProcessQueue from "./process-queue";
import RpcRouter from "./rpc-router";
import { Store } from "./store";
import {
  NODE_EVENTS,
  NodeEvents,
  NodeMessageWrappedProtocolMessage,
  RejectProposalMessage
} from "./types";
import { prettyPrintObject } from "./utils";

/**
 * This class registers handlers for requests to get or set some information
 * about app instances and channels for this Node and any relevant peer Nodes.
 */
export class RequestHandler {
  private readonly methods = new Map();

  router!: RpcRouter;

  constructor(
    readonly publicIdentifier: string,
    readonly incoming: EventEmitter,
    readonly outgoing: EventEmitter,
    readonly store: Store,
    readonly messagingService: Node.IMessagingService,
    readonly protocolRunner: ProtocolRunner,
    readonly networkContext: NetworkContext,
    readonly provider: Provider,
    readonly wallet: Signer,
    readonly blocksNeededForConfirmation: number,
    readonly processQueue: ProcessQueue
  ) {}

  injectRouter(router: RpcRouter) {
    this.router = router;
    this.mapPublicApiMethods();
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

  public async callMessageHandler(msg: Node.NodeMessage) {
    switch (msg.type) {
      case NODE_EVENTS.PROTOCOL_MESSAGE_EVENT:
        await handleReceivedProtocolMessage(
          this,
          // TODO: Replace type cast with input validation
          msg as NodeMessageWrappedProtocolMessage
        );
        break;

      case NODE_EVENTS.REJECT_INSTALL:
      case NODE_EVENTS.REJECT_INSTALL_VIRTUAL:
        // TODO: Replace type cast with input validation
        await handleRejectProposalMessage(this, msg as RejectProposalMessage);
        break;

      default:
        throw new Error(`Received unknown message ${msg.type}`);
    }

    this.router.emit(msg.type, msg);
  }

  public async hasMessageHandler(event: NodeEvents) {
    return [
      NODE_EVENTS.PROTOCOL_MESSAGE_EVENT,
      NODE_EVENTS.REJECT_INSTALL,
      NODE_EVENTS.REJECT_INSTALL_VIRTUAL
    ].includes(event);
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
