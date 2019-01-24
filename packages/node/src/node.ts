import {
  Context,
  InstructionExecutor,
  Opcode,
  Protocol,
  ProtocolMessage,
  SetupParams
} from "@counterfactual/machine";
import { NetworkContext, Node as NodeTypes } from "@counterfactual/types";
import { Provider } from "ethers/providers";
import { getAddress, SigningKey } from "ethers/utils";
import EventEmitter from "eventemitter3";

import { Deferred } from "./deferred";
import { RequestHandler } from "./request-handler";
import { IMessagingService, IStoreService } from "./services";
import { getSigner } from "./signer";
import {
  NODE_EVENTS,
  NodeMessage,
  NodeMessageWrappedProtocolMessage
} from "./types";

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

  private ioSendDeferrals: {
    [address: string]: Deferred<NodeMessageWrappedProtocolMessage>;
  } = {};

  // These properties don't have initializers in the constructor and get
  // initialized in the `init` function
  private signer!: SigningKey;
  protected requestHandler!: RequestHandler;

  static async create(
    messagingService: IMessagingService,
    storeService: IStoreService,
    networkContext: NetworkContext,
    nodeConfig: NodeConfig,
    provider: Provider
  ): Promise<Node> {
    const node = new Node(
      messagingService,
      storeService,
      networkContext,
      nodeConfig,
      provider
    );

    return await node.asyncronouslySetupUsingRemoteServices();
  }

  private constructor(
    private readonly messagingService: IMessagingService,
    private readonly storeService: IStoreService,
    private readonly networkContext: NetworkContext,
    private readonly nodeConfig: NodeConfig,
    private readonly provider: Provider
  ) {
    this.incoming = new EventEmitter();
    this.outgoing = new EventEmitter();
    this.instructionExecutor = this.buildInstructionExecutor();
  }

  private async asyncronouslySetupUsingRemoteServices(): Promise<Node> {
    this.signer = await getSigner(this.storeService);
    this.requestHandler = new RequestHandler(
      this.signer.address,
      this.incoming,
      this.outgoing,
      this.storeService,
      this.messagingService,
      this.instructionExecutor,
      this.networkContext,
      this.provider,
      `${this.nodeConfig.STORE_KEY_PREFIX}/${this.signer.address}`
    );
    this.registerMessagingConnection();
    return this;
  }

  get address() {
    return this.signer.address;
  }

  /**
   * Instantiates a new _InstructionExecutor_ object and attaches middleware
   * for the OP_SIGN, IO_SEND, and IO_SEND_AND_WAIT opcodes.
   */
  private buildInstructionExecutor(): InstructionExecutor {
    const instructionExecutor = new InstructionExecutor(this.networkContext);

    instructionExecutor.register(
      Opcode.OP_SIGN,
      async (message: ProtocolMessage, next: Function, context: Context) => {
        if (!context.commitment) {
          // TODO: I think this should be inside the machine for all protocols
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

    instructionExecutor.register(
      Opcode.IO_SEND,
      async (message: ProtocolMessage, next: Function, context: Context) => {
        const [data] = context.outbox;
        const from = getAddress(this.address);
        const to = getAddress(data.toAddress);

        await this.messagingService.send(to, {
          from,
          data,
          type: NODE_EVENTS.PROTOCOL_MESSAGE_EVENT
        } as NodeMessageWrappedProtocolMessage);

        next();
      }
    );

    instructionExecutor.register(
      Opcode.IO_SEND_AND_WAIT,
      async (message: ProtocolMessage, next: Function, context: Context) => {
        const [data] = context.outbox;
        const from = getAddress(this.address);
        const to = getAddress(data.toAddress);

        this.ioSendDeferrals[to] = new Deferred<
          NodeMessageWrappedProtocolMessage
        >();

        await this.messagingService.send(to, {
          from,
          data,
          type: NODE_EVENTS.PROTOCOL_MESSAGE_EVENT
        } as NodeMessageWrappedProtocolMessage);

        const msg = await this.ioSendDeferrals[to].promise;

        context.inbox.push(msg.data);

        next();
      }
    );

    instructionExecutor.register(
      Opcode.STATE_TRANSITION_COMMIT,
      async (message: ProtocolMessage, next: Function, context: Context) => {
        if (!context.commitment) {
          throw new Error(
            `State transition without commitment: ${JSON.stringify(message)}`
          );
        }
        const transaction = context.commitment!.transaction([
          context.signature! // TODO: add counterparty signature
        ]);
        const { protocol } = message;
        if (protocol === Protocol.Setup) {
          const params = message.params as SetupParams;
          await this.requestHandler.store.setSetupCommitmentForMultisig(
            params.multisigAddress,
            transaction
          );
        } else {
          if (!context.appIdentityHash) {
            throw new Error(
              `appIdentityHash required to store commitment. protocol=${protocol}`
            );
          }
          await this.requestHandler.store.setCommitmentForAppIdentityHash(
            context.appIdentityHash!,
            protocol,
            transaction
          );
        }
        next();
      }
    );

    return instructionExecutor;
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
   * with the messaging service. When it receives a message, it emits
   * the message to its registered subscribers, usually external
   * subscribed (i.e. consumers of the Node).
   */
  private registerMessagingConnection() {
    this.messagingService.onReceive(
      getAddress(this.address),
      async (msg: NodeMessage) => {
        await this.handleReceivedMessage(msg);
        this.outgoing.emit(msg.type, msg);
      }
    );
  }

  /**
   * Messages received by the Node fit into one of three categories:
   *
   * (a) A NodeMessage which is _not_ a NodeMessageWrappedProtocolMessage;
   *     this is a standard received message which is handled by a named
   *     controller in the _events_ folder.
   *
   * (b) A NodeMessage which is a NodeMessageWrappedProtocolMessage _and_
   *     has no registered _ioSendDeferral_ callback. In this case, it means
   *     it will be sent to the protocol message event controller to dispatch
   *     the received message to the instruction executor.
   *
   * (c) A NodeMessage which is a NodeMessageWrappedProtocolMessage _and_
   *     _does have_ an _ioSendDeferral_, in which case the message is dispatched
   *     solely to the deffered promise's resolve callback.
   */
  private async handleReceivedMessage(msg: NodeMessage) {
    if (!Object.values(NODE_EVENTS).includes(msg.type)) {
      console.error(`Received message with unknown event type: ${msg.type}`);
    }

    const isIoSendDeferral = (msg: NodeMessage) =>
      msg.type === NODE_EVENTS.PROTOCOL_MESSAGE_EVENT &&
      this.ioSendDeferrals[msg.from] !== undefined;

    if (isIoSendDeferral(msg)) {
      this.handleIoSendDeferral(msg as NodeMessageWrappedProtocolMessage);
    } else {
      await this.requestHandler.callEvent(msg.type, msg);
    }
  }

  private async handleIoSendDeferral(msg: NodeMessageWrappedProtocolMessage) {
    try {
      this.ioSendDeferrals[msg.from].resolve(msg);
    } catch (error) {
      console.error(
        `Error while executing callback registered by IO_SEND_AND_WAIT middleware hook`,
        { error, msg }
      );
    }

    delete this.ioSendDeferrals[msg.from];
  }
}
