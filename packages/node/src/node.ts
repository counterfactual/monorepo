import {
  Context,
  InstructionExecutor,
  Opcode,
  ProtocolMessage,
  StateChannel
} from "@counterfactual/machine";
import { InstallParams } from "@counterfactual/machine/dist/src/protocol-types-tbd";
import { NetworkContext, Node as NodeTypes } from "@counterfactual/types";
import { defaultAbiCoder, keccak256, SigningKey } from "ethers/utils";
import EventEmitter from "eventemitter3";

import { createAppInstanceFromAppInstanceInfo } from "./methods/app-instance/install/operation";
import { RequestHandler } from "./request-handler";
import { IMessagingService, IStoreService } from "./services";
import { Store } from "./store";
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

  private readonly signer: SigningKey;

  private readonly instructionExecutor: InstructionExecutor;

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

    this.instructionExecutor = new InstructionExecutor(networkContext);

    this.registerOpSignMiddleware();

    this.registerIoMiddleware();

    this.requestHandler = new RequestHandler(
      this.signer.address,
      this.incoming,
      this.outgoing,
      this.storeService,
      this.messagingService,
      this.instructionExecutor,
      networkContext,
      `${nodeConfig.STORE_KEY_PREFIX}/${this.signer.address}`
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
    /**
     * Objective: Send a message `message` to a person `message.toAddress`
     */
    this.instructionExecutor.register(Opcode.IO_SEND, async (
      // TODO: Figure out conversion of NodeMessage and ProtocolMessage
      message: any /* ProtocolMessage */,
      next: Function,
      context: Context
    ) => {
      const outboxMessage = context.outbox[0];
      // console.debug("Sending a message from IO_SEND hook", {
      //   selfAddress: this.address
      // });
      await this.messagingService.send(
        outboxMessage.toAddress,
        outboxMessage as any // TODO: Either coerce into NodeMessage or update send types
      );
      next();
    });

    /**
     * Objective: For a message `message`, register a callback that only
     *            resolves if a new message (newMessage) is _received_ with:
     *
     *            (a) newMessage.from === `message.toAddress`
     *            (b) newMessage.requestId === `message.requestId`
     */
    this.instructionExecutor.register(
      Opcode.IO_WAIT,
      async (message: ProtocolMessage, next: Function, context: Context) => {
        // console.debug("Turning on listener for IO_WAIT", {
        //   selfAddress: this.address
        // });
        await new Promise(resolve => {
          this.messagingService.onReceive(
            this.address,
            (newMessage: NodeMessage) => {
              if (newMessage.event !== undefined) {
                return; // TODO: Try to avoid having to ignore NodeMessages
                // or better yet, generally implement a single message router
              }
              if (((newMessage as unknown) as ProtocolMessage).seq === 2) {
                // console.debug("Received message in IO_WAIT hook", {
                //   selfAddress: this.address
                // });
                context.inbox.push((newMessage as unknown) as ProtocolMessage);
                resolve();
                next();
              }
            }
          );
        });
      }
    );
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
    this.messagingService.onReceive(this.address, async (msg: NodeMessage) => {
      if (Object.values(NODE_EVENTS).includes(msg.event)) {
        // (major) TODO: events should not run for things handled by machine
        if (msg.event !== NODE_EVENTS.INSTALL) {
          await this.requestHandler.callEvent(msg.event, msg);
        }
        this.outgoing.emit(msg.event, msg);
      } else if (msg.event !== undefined) {
        console.error(
          `Received message with unrecognized msg.event: ${msg.event}`
        );
      } else {
        // console.debug(
        //   "Probably received a ProtocolMessage which the machine is expected to handle :)",
        //   {
        //     selfAddress: this.address,
        //     seq: ((msg as unknown) as ProtocolMessage).seq
        //   }
        // );
        if (((msg as unknown) as ProtocolMessage).protocol === "install") {
          // TODO: The machine should just not send seq 2 I don't think?
          if (((msg as unknown) as ProtocolMessage).seq === 2) {
            return;
          }
          const stateChannelsObject = await this.requestHandler.store.getAllChannels();

          const updatedStateChannelsMap = await this.instructionExecutor.dispatchReceivedMessage(
            (msg as unknown) as ProtocolMessage,
            new Map<string, StateChannel>([
              [
                Object.keys(stateChannelsObject)[0],
                Object.values(stateChannelsObject)[0]
              ]
            ])
          );

          /**
           * The following is copied from the "install" operation... we need to re-
           * structure how events update the DB state in light of the middleware
           * STATE_TRANSITION_COMMIT which should be doing the work on this one.
           */
          await (async (
            store: Store,
            updatedStateChannelMap: Map<string, StateChannel>
          ) => {
            const { params } = (msg as unknown) as { params: InstallParams };
            const appInstanceId = await store.getAppInstanceIDFromAppInstanceIdentityHash(
              keccak256(
                defaultAbiCoder.encode(
                  [
                    `tuple(
                      address owner,
                      address[] signingKeys,
                      address appDefinitionAddress,
                      bytes32 termsHash,
                      uint256 defaultTimeout
                    )`
                  ],
                  [
                    {
                      owner: params.multisigAddress,
                      signingKeys: params.signingKeys,
                      appDefinitionAddress: params.appInterface.addr,
                      termsHash: keccak256(
                        defaultAbiCoder.encode(
                          [
                            `tuple(
                              uint8 assetType,
                              uint256 limit,
                              address token
                            )`
                          ],
                          [params.terms]
                        )
                      ),
                      defaultTimeout: params.defaultTimeout
                    }
                  ]
                )
              )
            );

            const appInstanceInfo = await store.getProposedAppInstanceInfo(
              appInstanceId
            );

            const stateChannel = await store.getChannelFromAppInstanceID(
              appInstanceId
            );

            const appInstance = createAppInstanceFromAppInstanceInfo(
              appInstanceInfo,
              stateChannel
            );

            delete appInstanceInfo.initialState;

            await store.updateChannelWithAppInstanceInstallation(
              updatedStateChannelMap.get(stateChannel.multisigAddress)!,
              appInstance,
              appInstanceInfo
            );

            this.outgoing.emit(NODE_EVENTS.INSTALL, {
              from: this.requestHandler.address,
              event: NODE_EVENTS.INSTALL,
              data: {
                params: {
                  appInstanceId: appInstanceInfo.id
                }
              }
            });
          })(this.requestHandler.store, updatedStateChannelsMap);
        }
      }
    });
  }
}
