import {
  Context,
  InstructionExecutor,
  Opcode,
  ProtocolMessage
} from "@counterfactual/machine";
import { NetworkContext, Node as NodeTypes } from "@counterfactual/types";
import { SigningKey } from "ethers/utils";
import EventEmitter from "eventemitter3";

import { RequestHandler } from "./request-handler";
import { IMessagingService, IStoreService } from "./services";
import { getSigner } from "./signer";
import { NODE_EVENTS, NodeMessage } from "./types";

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

  private readonly instructionExecutor: InstructionExecutor;

  // These properties don't have initializers in the constructor and get
  // initialized in the `init` function
  private signer!: SigningKey;
  protected requestHandler!: RequestHandler;

  static async create(
    messagingService: IMessagingService,
    storeService: IStoreService,
    networkContext: NetworkContext,
    nodeConfig: NodeConfig
  ): Promise<Node> {
    const node = new Node(
      messagingService,
      storeService,
      networkContext,
      nodeConfig
    );
    await node.init();
    return node;
  }

  private constructor(
    private readonly messagingService: IMessagingService,
    private readonly storeService: IStoreService,
    private readonly networkContext: NetworkContext,
    private readonly nodeConfig: NodeConfig
  ) {
    this.incoming = new EventEmitter();
    this.outgoing = new EventEmitter();
    this.instructionExecutor = new InstructionExecutor(networkContext);
    this.registerOpSignMiddleware();
    this.registerIoMiddleware();
  }

  private async init() {
    this.signer = await getSigner(this.storeService);
    this.registerMessagingConnection();
    this.requestHandler = new RequestHandler(
      this.signer.address,
      this.incoming,
      this.outgoing,
      this.storeService,
      this.messagingService,
      this.instructionExecutor,
      this.networkContext,
      `${this.nodeConfig.STORE_KEY_PREFIX}/${this.signer.address}`
    );
  }

  get address() {
    return this.signer.address;
  }

  private registerOpSignMiddleware() {
    this.instructionExecutor.register(
      Opcode.OP_SIGN,
      async (message: ProtocolMessage, next: Function, context: Context) => {
        if (!context.commitment) {
          throw Error(
            "Reached OP_SIGN middleware without generated commitment."
          );
        }
        context.signature = this.signer.signDigest(
          context.commitment.hashToSign()
        );
        next();
      }
    );
  }

  private registerIoMiddleware() {
    // TODO:
    this.instructionExecutor.register(Opcode.IO_SEND, () => {});
    this.instructionExecutor.register(Opcode.IO_WAIT, () => {});
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
    if (!Object.values(NODE_EVENTS).includes(msg.event)) {
      console.log("Event not recognized, no-op");
      return;
    }
    await this.requestHandler.callEvent(msg.event, msg);
  }
}
