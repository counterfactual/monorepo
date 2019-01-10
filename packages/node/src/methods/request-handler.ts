import {
  Context,
  InstructionExecutor,
  Opcode,
  Protocol,
  ProtocolMessage
} from "@counterfactual/machine";
import { Address, NetworkContext, Node } from "@counterfactual/types";
import EventEmitter from "eventemitter3";

import { NodeMessage } from "../node";
import { IMessagingService, IStoreService } from "../services";
import { Store } from "../store";

import {
  getInstalledAppInstances,
  getProposedAppInstances,
  handleGetAppInstanceState
} from "./app-instance-operations";
import {
  addAppInstance,
  installAppInstance,
  proposeAppInstanceInstall
} from "./install-operations";
import {
  addMultisig,
  createMultisig,
  getAllChannelAddresses
} from "./multisig-operations";

/**
 * This class registers handlers for requests to get or set some information
 * about app instances and channels for this Node and any relevant peer Nodes.
 */
export class RequestHandler {
  private methods = new Map();
  private events = new Map();
  store: Store;
  constructor(
    readonly selfAddress: Address,
    readonly incoming: EventEmitter,
    readonly outgoing: EventEmitter,
    readonly storeService: IStoreService,
    readonly messagingService: IMessagingService,
    readonly instructionExecutor: InstructionExecutor,
    readonly networkContext: NetworkContext,
    storeKeyPrefix: string
  ) {
    this.store = new Store(storeService, storeKeyPrefix);
    this.registerMethods();
    this.mapEventHandlers();
    this.startStoringCommitments();
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
      getAllChannelAddresses.bind(this)
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
      proposeAppInstanceInstall.bind(this)
    );
    this.methods.set(Node.MethodName.INSTALL, installAppInstance.bind(this));
    this.methods.set(
      Node.MethodName.GET_STATE,
      handleGetAppInstanceState.bind(this)
    );
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

  private startStoringCommitments() {
    this.instructionExecutor.register(
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
          await this.store.setSetupCommitmentForMultisig(
            message.multisigAddress,
            transaction
          );
        } else {
          if (!context.appIdentityHash) {
            throw new Error(
              `appIdentityHash required to store commitment. protocol=${protocol}`
            );
          }
          await this.store.setCommitmentForAppIdentityHash(
            context.appIdentityHash!,
            protocol,
            transaction
          );
        }
        next();
      }
    );
  }
}
