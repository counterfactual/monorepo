import {
  Context,
  InstructionExecutor,
  Opcode,
  Protocol,
  ProtocolMessage,
  SetupParams
} from "@counterfactual/machine";
import {
  UpdateParams,
  WithdrawParams
} from "@counterfactual/machine/dist/src/types";
import { NetworkContext, Node as NodeTypes } from "@counterfactual/types";
import { Wallet } from "ethers";
import { BaseProvider, JsonRpcProvider } from "ethers/providers";
import { SigningKey } from "ethers/utils";
import { HDNode } from "ethers/utils/hdnode";
import EventEmitter from "eventemitter3";

import { Deferred } from "./deferred";
import { configureNetworkContext } from "./network-configuration";
import { RequestHandler } from "./request-handler";
import { IMessagingService, IStoreService } from "./services";
import { getHDNode } from "./signer";
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
  private readonly networkContext: NetworkContext;

  private ioSendDeferrals = new Map<
    string,
    Deferred<NodeMessageWrappedProtocolMessage>
  >();

  // These properties don't have initializers in the constructor and get
  // initialized in the `asynchronouslySetupUsingRemoteServices` function
  private signer!: HDNode;
  protected requestHandler!: RequestHandler;

  static async create(
    messagingService: IMessagingService,
    storeService: IStoreService,
    nodeConfig: NodeConfig,
    provider: JsonRpcProvider | BaseProvider,
    network: string,
    networkContext?: NetworkContext
  ): Promise<Node> {
    const node = new Node(
      messagingService,
      storeService,
      nodeConfig,
      provider,
      network,
      networkContext
    );

    return await node.asynchronouslySetupUsingRemoteServices();
  }

  private constructor(
    private readonly messagingService: IMessagingService,
    private readonly storeService: IStoreService,
    private readonly nodeConfig: NodeConfig,
    private readonly provider: JsonRpcProvider | BaseProvider,
    public readonly network: string,
    networkContext?: NetworkContext
  ) {
    this.incoming = new EventEmitter();
    this.outgoing = new EventEmitter();
    this.networkContext = configureNetworkContext(network, networkContext);
    this.instructionExecutor = this.buildInstructionExecutor();
  }

  private async asynchronouslySetupUsingRemoteServices(): Promise<Node> {
    this.signer = await getHDNode(this.storeService);

    this.requestHandler = new RequestHandler(
      this.publicIdentifier,
      this.incoming,
      this.outgoing,
      this.storeService,
      this.messagingService,
      this.instructionExecutor,
      this.networkContext,
      this.provider,
      new Wallet(this.signer.privateKey, this.provider),
      `${this.nodeConfig.STORE_KEY_PREFIX}/${this.publicIdentifier}`
    );
    this.registerMessagingConnection();
    return this;
  }

  get publicIdentifier(): string {
    return this.signer.neuter().extendedKey;
  }

  /**
   * Instantiates a new _InstructionExecutor_ object and attaches middleware
   * for the OP_SIGN, IO_SEND, and IO_SEND_AND_WAIT opcodes.
   */
  private buildInstructionExecutor(): InstructionExecutor {
    const instructionExecutor = new InstructionExecutor(this.networkContext);

    // todo(xuanji): remove special cases
    const makeSigner = (asIntermediary: boolean) => {
      return async (
        message: ProtocolMessage,
        next: Function,
        context: Context
      ) => {
        if (context.commitments.length === 0) {
          // TODO: I think this should be inside the machine for all protocols
          throw Error(
            "Reached OP_SIGN middleware without generated commitment."
          );
        }

        let keyIndex = 0;

        if (message.protocol === Protocol.Update) {
          const {
            appIdentityHash,
            multisigAddress
          } = message.params as UpdateParams;
          keyIndex = context.stateChannelsMap
            .get(multisigAddress)!
            .getAppInstance(appIdentityHash).appSeqNo;
        }

        const signingKey = new SigningKey(
          this.signer.derivePath(`${keyIndex}`).privateKey
        );

        context.signatures = context.commitments.map(commitment =>
          signingKey.signDigest(commitment.hashToSign(asIntermediary))
        );

        next();
      };
    };

    instructionExecutor.register(Opcode.OP_SIGN, makeSigner(false));

    instructionExecutor.register(
      Opcode.OP_SIGN_AS_INTERMEDIARY,
      makeSigner(true)
    );

    instructionExecutor.register(
      Opcode.IO_SEND,
      async (message: ProtocolMessage, next: Function, context: Context) => {
        const [data] = context.outbox;
        const from = this.publicIdentifier;
        const to = data.toAddress;

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
        const from = this.publicIdentifier;
        const to = data.toAddress;

        const key = this.encodeProtocolMessage(message);
        const deferral = new Deferred<NodeMessageWrappedProtocolMessage>();

        this.ioSendDeferrals.set(key, deferral);

        const counterpartyResponse = deferral.promise;

        await this.messagingService.send(to, {
          from,
          data,
          type: NODE_EVENTS.PROTOCOL_MESSAGE_EVENT
        } as NodeMessageWrappedProtocolMessage);

        const msg = await counterpartyResponse;

        // Removes the deferral from the list of pending defferals after
        // its promise has been resolved and the necessary callback (above)
        // has been called. Note that, as is, only one defferal can be open
        // per counterparty at the moment.
        this.ioSendDeferrals.delete(key);

        context.inbox.push(msg.data);

        next();
      }
    );

    instructionExecutor.register(
      Opcode.STATE_TRANSITION_COMMIT,
      async (message: ProtocolMessage, next: Function, context: Context) => {
        if (!context.commitments[0]) {
          throw new Error(
            `State transition without commitment: ${JSON.stringify(message)}`
          );
        }
        const transaction = context.commitments[0].transaction([
          context.signatures[0] // TODO: add counterparty signature
        ]);
        const { protocol } = message;
        if (protocol === Protocol.Setup) {
          const params = message.params as SetupParams;
          await this.requestHandler.store.setSetupCommitmentForMultisig(
            params.multisigAddress,
            transaction
          );
        } else if (protocol === Protocol.Withdraw) {
          const params = message.params as WithdrawParams;
          await this.requestHandler.store.storeWithdrawalCommitment(
            params.multisigAddress,
            context.commitments[1].transaction([
              context.signatures[1],
              context.inbox[0].signature2!
            ])
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
   * Stops listening for a given message from other Nodes. If no callback is passed,
   * all callbacks are removed.
   *
   * @param event
   * @param [callback]
   */
  off(event: string, callback?: (res: any) => void) {
    this.outgoing.off(event, callback);
  }

  /**
   * This is the entrypoint to listening for messages from other Nodes.
   * Delegates setting up a listener to the Node's outgoing EventEmitter.
   * It'll run the callback *only* once.
   *
   * @param event
   * @param [callback]
   */
  once(event: string, callback: (res: any) => void) {
    this.outgoing.once(event, callback);
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
      this.publicIdentifier,
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

    const isProtocolMessage = (msg: NodeMessage) =>
      msg.type === NODE_EVENTS.PROTOCOL_MESSAGE_EVENT;

    const isExpectingResponse = (msg: NodeMessageWrappedProtocolMessage) =>
      this.ioSendDeferrals.has(this.encodeProtocolMessage(msg.data));

    if (
      isProtocolMessage(msg) &&
      isExpectingResponse(msg as NodeMessageWrappedProtocolMessage)
    ) {
      await this.handleIoSendDeferral(msg as NodeMessageWrappedProtocolMessage);
    } else {
      await this.requestHandler.callEvent(msg.type, msg);
    }
  }

  private async handleIoSendDeferral(msg: NodeMessageWrappedProtocolMessage) {
    const key = this.encodeProtocolMessage(msg.data);

    if (!this.ioSendDeferrals.has(key)) {
      throw Error(
        "Node received message intended for machine but no handler was present"
      );
    }

    const promise = this.ioSendDeferrals.get(key)!;

    try {
      promise.resolve(msg);
    } catch (error) {
      console.error(
        `Error while executing callback registered by IO_SEND_AND_WAIT middleware hook`,
        { error, msg }
      );
    }
  }

  private encodeProtocolMessage(msg: ProtocolMessage) {
    return JSON.stringify({
      protocol: msg.protocol,
      params: JSON.stringify(msg.params, Object.keys(msg.params).sort())
    });
  }
}
