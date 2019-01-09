import { InstructionExecutor } from "@counterfactual/machine";
import {
  Address,
  NetworkContext,
  Node as NodeTypes
} from "@counterfactual/types";
import { SigningKey } from "ethers/utils";
import EventEmitter from "eventemitter3";

import { RequestHandler } from "./methods/request-handler";
import { IMessagingService, IStoreService } from "./services";

export interface NodeConfig {
  // The prefix for any keys used in the store by this Node depends on the
  // execution environment.
  STORE_KEY_PREFIX: string;
}

export class Node {
  /**
   * Because the Node receives and sends out messages based on Event type
   * https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#events
   * incoming and outgoing emitters need to be used.
   **/
  private readonly incoming: EventEmitter;
  private readonly outgoing: EventEmitter;

  private readonly signer: SigningKey;

  protected readonly requestHandler: RequestHandler;

  /**
   * @param privateKey
   * @param messagingService
   */
  constructor(
    privateKey: string,
    private readonly messagingService: IMessagingService,
    private readonly storeService: IStoreService,
    readonly networkContext: NetworkContext,
    nodeConfig: NodeConfig
  ) {
    this.signer = new SigningKey(privateKey);
    this.incoming = new EventEmitter();
    this.outgoing = new EventEmitter();
    this.registerMessagingConnection();
    this.requestHandler = new RequestHandler(
      this.signer.address,
      this.incoming,
      this.outgoing,
      this.storeService,
      this.messagingService,
      new InstructionExecutor(networkContext),
      networkContext,
      `${nodeConfig.STORE_KEY_PREFIX}/${this.signer.address}`
    );
  }

  get address() {
    return this.signer.address;
  }

  /**
   * This is the entrypoint to listening for messages from other Nodes.
   * Delegates setting up a listener to the Node's outgoing EventEmitter.
   * @param event
   * @param callback
   */
  on(event: string, callback: (res: any) => void) {
    this.outgoing.on(event, callback);
  }

  /**
   * Delegates emitting events to the Node's incoming EventEmitter.
   * @param event
   * @param req
   */
  emit(event: string, req: NodeTypes.MethodRequest) {
    this.incoming.emit(event, req);
  }

  /**
   * Makes a direct call to the Node for a specific method.
   * @param method
   * @param req
   */
  async call(
    method: NodeTypes.MethodName,
    req: NodeTypes.MethodRequest
  ): Promise<NodeTypes.MethodResponse> {
    return this.requestHandler.callMethod(method, req);
  }

  /**
   * When a Node is first instantiated, it establishes a connection
   * with the messaging service.
   * When it receives a message, it emits the message to its registered subscribers,
   * usually external subscribed (i.e. consumers of the Node).
   */
  private registerMessagingConnection() {
    this.messagingService.receive(this.address, async (msg: NodeMessage) => {
      await this.preprocessMessage(msg);
      this.outgoing.emit(msg.event, msg);
    });
  }

  /**
   * Each internal event handler is responsible for deciding how to process
   * the incoming message.
   * @param msg
   */
  private async preprocessMessage(msg: NodeMessage) {
    if (!Object.values(NodeTypes.EventName).includes(msg.event)) {
      console.log("Event not recognized, no-op");
      return;
    }
    await this.requestHandler.callEvent(msg.event, msg);
  }
}

/**
 * The message interface for Nodes to communicate with each other.
 */
export interface NodeMessage {
  from?: Address;
  event: NodeTypes.EventName;
  data: any;
}
