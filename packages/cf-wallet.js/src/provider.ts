import {
  Address,
  AppInstanceID,
  AppInstanceInfo,
  JsonApi,
  JsonApiINodeProvider,
  Node
} from "@counterfactual/types";
import { BigNumber } from "ethers/utils";
import EventEmitter from "eventemitter3";

import { AppInstance } from "./app-instance";
import { CounterfactualEvent, EventType } from "./types";
import { deriveMethodName } from "./utils";

/**
 * Milliseconds until a method request to the Node is considered timed out.
 */
export const NODE_REQUEST_TIMEOUT = 20000;

/**
 * Provides convenience methods for interacting with a Counterfactual node
 */
export class Provider {
  /** @ignore */
  private readonly requestListeners: {
    [requestId: string]: (
      msg: JsonApi.Document | JsonApi.ErrorsDocument
    ) => void;
  } = {};
  /** @ignore */
  private readonly eventEmitter = new EventEmitter();
  /** @ignore */
  private readonly appInstances: { [appInstanceId: string]: AppInstance } = {};
  private readonly validEventTypes = Object.keys(EventType).map(
    key => EventType[key]
  );

  /**
   * Construct a new instance
   * @param nodeProvider NodeProvider instance that enables communication with the Counterfactual node
   */
  constructor(readonly nodeProvider: JsonApiINodeProvider) {
    this.nodeProvider.onMessage(this.onNodeMessage.bind(this));
  }

  /**
   * Install a non-virtual app instance given its ID.
   *
   * @note
   * Installs non-virtual app instances i.e. in a direct channel between you and your peer.
   * For virtual app instances use [[installVirtual]].
   *
   * @async
   *
   * @param appInstanceId ID of the app instance to be installed, generated using [[AppFactory.proposeInstall]]
   * @return Installed AppInstance
   */
  async install(appInstanceId: AppInstanceID): Promise<AppInstance> {
    const response = await this.callRawNodeMethod({
      op: Node.OpName.INSTALL,
      ref: {
        type: Node.TypeName.APP,
        id: appInstanceId
      }
    });
    const resource = Array.isArray(response.data)
      ? response.data[0]
      : response.data;
    const appInstance = resource.attributes as AppInstanceInfo;
    appInstance.id = resource.id || "";
    return this.getOrCreateAppInstance(appInstanceId, appInstance);
  }

  /**
   * Install a virtual app instance given its ID and a list of intermediaries.
   *
   * @note
   * Installs virtual app instances i.e. routed through at least one intermediary channel.
   * For non-virtual app instances use [[install]].
   *
   * @async
   *
   * @param appInstanceId ID of the app instance to be installed, generated with [[AppFactory.proposeInstallVirtual]].
   * @param intermediaryIdentifier address of intermediary peer to route installation through
   * @return Installed AppInstance
   */
  async installVirtual(
    appInstanceId: AppInstanceID,
    intermediaryIdentifier: Address
  ): Promise<AppInstance> {
    const response = await this.callRawNodeMethod({
      op: Node.OpName.INSTALL_VIRTUAL,
      ref: {
        type: Node.TypeName.APP,
        id: appInstanceId
      },
      data: {
        type: Node.TypeName.APP,
        relationships: {},
        attributes: {
          intermediaryIdentifier
        }
      }
    });
    const resource = Array.isArray(response.data)
      ? response.data[0]
      : response.data;
    const appInstance = resource.attributes as AppInstanceInfo;
    appInstance.id = resource.id || "";
    return this.getOrCreateAppInstance(appInstanceId, appInstance);
  }

  /**
   * Reject installation of a proposed app instance
   *
   * @async
   *
   * @param appInstanceId ID of the app instance to reject
   */
  async rejectInstall(appInstanceId: AppInstanceID) {
    await this.callRawNodeMethod({
      op: Node.OpName.REJECT,
      ref: {
        type: Node.TypeName.PROPOSAL
      },
      data: {
        type: Node.TypeName.PROPOSAL,
        relationships: {},
        attributes: {
          appInstanceId
        }
      }
    });
  }

  /**
   * Creates a channel by deploying a multisignature wallet contract.
   *
   * @async
   *
   * @param owners the addresses who should be the owners of the multisig
   */
  async createChannel(owners: Address[]) {
    const response = await this.callRawNodeMethod({
      op: Node.OpName.ADD,
      ref: {
        type: Node.TypeName.CHANNEL
      },
      data: {
        type: Node.TypeName.CHANNEL,
        relationships: {},
        attributes: {
          owners
        }
      }
    });

    const resource = Array.isArray(response.data)
      ? response.data[0]
      : response.data;
    return resource.attributes as Node.CreateChannelResult;
  }

  /**
   * Deposits the specified amount of funds into the channel
   * with the specified multisig address.
   *
   * @async
   *
   * @param multisigAddress Address of the state channel multisig
   * @param amount BigNumber representing the deposit's value
   */
  async deposit(multisigAddress: Address, amount: BigNumber) {
    await this.callRawNodeMethod({
      op: Node.OpName.DEPOSIT,
      ref: {
        type: Node.TypeName.CHANNEL
      },
      data: {
        type: Node.TypeName.CHANNEL,
        relationships: {},
        attributes: {
          multisigAddress,
          amount,
          notifyCounterparty: true
        }
      }
    });
  }

  /**
   * Withdraws the specified amount of funds into the channel
   * with the specified multisig address.
   *
   * @async
   *
   * @param multisigAddress Address of the state channel multisig
   * @param amount BigNumber representing the deposit's value
   */
  async withdraw(multisigAddress: Address, amount: BigNumber) {
    await this.callRawNodeMethod({
      op: Node.OpName.WITHDRAW,
      ref: {
        type: Node.TypeName.CHANNEL
      },
      data: {
        type: Node.TypeName.CHANNEL,
        relationships: {},
        attributes: {
          multisigAddress,
          amount
        }
      }
    });
  }

  /**
   * Queries for the current free balance state of the channel
   * with the specified multisig address.
   *
   * @async
   *
   * @param multisigAddress Address of the state channel multisig
   */
  async getFreeBalanceState(multisigAddress: Address) {
    const response = await this.callRawNodeMethod({
      op: Node.OpName.GET_FREE_BALANCE_STATE,
      ref: {
        type: Node.TypeName.CHANNEL
      },
      data: {
        type: Node.TypeName.CHANNEL,
        relationships: {},
        attributes: {
          multisigAddress
        }
      }
    });
    const resource = Array.isArray(response.data)
      ? response.data[0]
      : response.data;
    return resource.attributes as Node.GetFreeBalanceStateResult;
  }

  /**
   * Subscribe to event.
   *
   * @async
   *
   * @param eventType Event type to subscribe to.
   * @param callback Function to be called when event is fired.
   */
  on(eventType: EventType, callback: (e: CounterfactualEvent) => void) {
    this.validateEventType(eventType);
    this.eventEmitter.on(eventType, callback);
  }

  /**
   * Subscribe to event. Unsubscribe once event is fired once.
   *
   * @param eventType Event type to subscribe to.
   * @param callback Function to be called when event is fired.
   */
  once(eventType: EventType, callback: (e: CounterfactualEvent) => void) {
    this.validateEventType(eventType);
    this.eventEmitter.once(eventType, callback);
  }

  /**
   * Unsubscribe from event.
   *
   * @param eventType Event type to unsubscribe from.
   * @param callback Original callback passed to subscribe call.
   */
  off(eventType: EventType, callback: (e: CounterfactualEvent) => void) {
    this.validateEventType(eventType);
    this.eventEmitter.off(eventType, callback);
  }

  /**
   * Call a Node method
   *
   * @param methodName Name of Node method to call
   * @param params Method-specific parameter object
   */
  async callRawNodeMethod(
    operation: JsonApi.Operation
  ): Promise<JsonApi.Document> {
    const requestId = new Date().valueOf().toString();
    const methodName = deriveMethodName(operation);
    const document = {
      meta: {
        requestId
      },
      operations: [operation],
      data: []
    };

    return new Promise<JsonApi.Document>((resolve, reject) => {
      this.requestListeners[requestId] = response => {
        if (response.hasOwnProperty("errors")) {
          return reject({
            type: EventType.ERROR,
            data: response
          });
        }
        if ("operations" in response && response.operations) {
          const responseType = deriveMethodName(response.operations[0]);
          if (responseType !== methodName) {
            return reject({
              errors: [
                {
                  status: EventType.ERROR,
                  code: "unexpected_message_type",
                  detail: `Unexpected response type. Expected ${methodName}, got ${responseType}`
                }
              ]
            });
          }
        }

        resolve(response as JsonApi.Document);
      };
      setTimeout(() => {
        if (this.requestListeners[requestId] !== undefined) {
          reject({
            errors: [
              {
                status: EventType.ERROR,
                code: "request_timeout",
                detail: `Request timed out: ${JSON.stringify(document)}`
              }
            ]
          });
          delete this.requestListeners[requestId];
        }
      }, NODE_REQUEST_TIMEOUT);
      this.nodeProvider.sendMessage(document);
    });
  }

  /**
   * Get app instance given its ID.
   * If one doesn't exist, it will be created and its details will be loaded from the Node.
   *
   * @param id ID of app instance
   * @param info Optional info to be used to create app instance if it doesn't exist
   * @return App instance
   */
  async getOrCreateAppInstance(
    id: AppInstanceID,
    info?: AppInstanceInfo
  ): Promise<AppInstance> {
    if (!(id in this.appInstances)) {
      let newInfo;
      if (info) {
        newInfo = info;
      } else {
        const { data } = await this.callRawNodeMethod({
          op: Node.OpName.GET_STATE,
          ref: {
            id,
            type: Node.TypeName.APP
          }
        });
        const resource = Array.isArray(data) ? data[0] : data;
        newInfo = (resource.attributes as Node.GetAppInstanceDetailsResult)
          .appInstance;
      }
      this.appInstances[id] = new AppInstance(newInfo, this);
    }
    return this.appInstances[id];
  }

  /**
   * @ignore
   */
  private validateEventType(eventType: EventType) {
    if (!this.validEventTypes.includes(eventType)) {
      throw new Error(`"${eventType}" is not a valid event`);
    }
  }

  /**
   * @ignore
   */
  private onNodeMessage(message: JsonApi.Document | JsonApi.ErrorsDocument) {
    if (message.hasOwnProperty("errors")) {
      this.handleNodeError(message as JsonApi.ErrorsDocument);
    } else if (
      message.meta &&
      message.meta.requestId &&
      message.meta.requestId !== ""
    ) {
      this.handleNodeMethodResponse(message as JsonApi.Document);
    } else {
      this.handleNodeEvent(message as JsonApi.Document);
    }
  }

  /**
   * @ignore
   */
  private handleNodeError(errorsDocument: JsonApi.ErrorsDocument) {
    const requestId =
      errorsDocument.meta && (errorsDocument.meta.requestId as string);
    if (requestId) {
      if (requestId && this.requestListeners[requestId]) {
        this.requestListeners[requestId](errorsDocument);
        delete this.requestListeners[requestId];
      }
    }
    errorsDocument.errors.forEach(error => {
      // todo: should we use the equivalent of request.operation.op?
      this.eventEmitter.emit(EventType.ERROR, error);
    });
  }

  /**
   * @ignore
   */
  private handleNodeMethodResponse(response: JsonApi.Document) {
    if (!response.meta) return;

    const requestId = response.meta.requestId as string;
    if (requestId in this.requestListeners) {
      this.requestListeners[requestId](response);
      delete this.requestListeners[requestId];
    } else {
      const error = {
        type: EventType.ERROR,
        data: {
          errorName: "orphaned_response",
          message: `Response has no corresponding inflight request: ${JSON.stringify(
            response
          )}`
        }
      };
      this.eventEmitter.emit(error.type, error);
    }
  }

  /**
   * @ignore
   */
  private async handleNodeEvent(nodeEvent: JsonApi.Document) {
    if (!nodeEvent.operations) return;

    nodeEvent.operations.forEach(operation => {
      if (
        this.isEventType(operation, Node.OpName.REJECT, Node.TypeName.PROPOSAL)
      ) {
        this.handleRejectInstallEvent(nodeEvent);
      } else if (
        this.isEventType(operation, Node.OpName.INSTALL, Node.TypeName.APP)
      ) {
        this.handleInstallEvent(nodeEvent);
      } else if (
        this.isEventType(
          operation,
          Node.OpName.INSTALL_VIRTUAL,
          Node.TypeName.APP
        )
      ) {
        this.handleInstallVirtualEvent(nodeEvent);
      } else {
        this.handleUnexpectedEvent(nodeEvent);
      }
    });
  }

  /**
   * @ignore
   */
  private isEventType(
    operation: JsonApi.Operation,
    opName: Node.OpName,
    typeName: Node.TypeName
  ) {
    return operation.ref.type === typeName && operation.op === opName;
  }

  /**
   * @ignore
   */
  private handleUnexpectedEvent(nodeEvent: JsonApi.Document) {
    const type = nodeEvent.operations ? nodeEvent.operations[0].op : "unknown";
    const event = {
      type: EventType.ERROR,
      data: {
        errorName: "unexpected_event_type",
        message: `Unexpected event type: ${type}: ${JSON.stringify(nodeEvent)}`
      }
    };
    return this.eventEmitter.emit(event.type, event);
  }

  /**
   * @ignore
   */
  private async handleInstallEvent(nodeEvent: JsonApi.Document) {
    const data = Array.isArray(nodeEvent.data)
      ? nodeEvent.data[0]
      : nodeEvent.data;
    const appInstanceId = data.id || "";
    const appInstance = await this.getOrCreateAppInstance(appInstanceId);
    const event = {
      type: EventType.INSTALL,
      data: {
        appInstance
      }
    };
    return this.eventEmitter.emit(event.type, event);
  }

  /**
   * @ignore
   */
  private async handleInstallVirtualEvent(nodeEvent: JsonApi.Document) {
    const data = Array.isArray(nodeEvent.data)
      ? nodeEvent.data[0]
      : nodeEvent.data;
    const appInstanceId = data.id || "";
    const appInstance = await this.getOrCreateAppInstance(appInstanceId);
    const event = {
      type: EventType.INSTALL_VIRTUAL,
      data: {
        appInstance
      }
    };
    return this.eventEmitter.emit(event.type, event);
  }

  /**
   * @ignore
   */
  private async handleRejectInstallEvent(nodeEvent: JsonApi.Document) {
    const data = Array.isArray(nodeEvent.data)
      ? nodeEvent.data[0]
      : nodeEvent.data;
    const info = data.attributes as AppInstanceInfo;
    info.id = data.id || "";
    const appInstance = await this.getOrCreateAppInstance(info.id, info);
    const event = {
      type: EventType.REJECT_INSTALL,
      data: {
        appInstance
      }
    };
    return this.eventEmitter.emit(event.type, event);
  }
}
