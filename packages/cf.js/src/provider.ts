import cuid from "cuid";
import EventEmitter from "eventemitter3";

import { AppInstance } from "./app-instance";
import {
  AppInstanceID,
  AppInstanceInfo,
  CounterfactualEvent,
  EventType,
  INodeProvider,
  Node
} from "./types";

const NODE_REQUEST_TIMEOUT = 1500;

export class Provider {
  private readonly requestListeners: {
    [requestId: string]: (msg: Node.Message) => void;
  } = {};
  private readonly eventEmitter = new EventEmitter();
  private readonly appInstances: { [appInstanceId: string]: AppInstance } = {};

  constructor(readonly nodeProvider: INodeProvider) {
    this.nodeProvider.onMessage(this.onNodeMessage.bind(this));
  }

  async getAppInstances(): Promise<AppInstance[]> {
    const response = await this.callNodeMethod(
      Node.MethodName.GET_APP_INSTANCES,
      {}
    );
    const result = response.result as Node.GetAppInstancesResult;
    return result.appInstances.map(info => new AppInstance(info));
  }

  on(eventName: EventType, callback: (e: CounterfactualEvent) => void) {
    this.eventEmitter.on(eventName, callback);
  }

  once(eventName: EventType, callback: (e: CounterfactualEvent) => void) {
    this.eventEmitter.once(eventName, callback);
  }

  private async callNodeMethod(
    methodName: Node.MethodName,
    params: Node.MethodParams
  ): Promise<Node.MethodResponse> {
    const requestId = cuid();
    return new Promise<Node.MethodResponse>((resolve, reject) => {
      this.requestListeners[requestId] = response => {
        if (response.type === Node.ErrorType.ERROR) {
          return reject(response);
        }
        if (response.type !== methodName) {
          return reject({
            type: Node.ErrorType.ERROR,
            data: {
              errorName: "unexpected_message_type",
              message: `Unexpected response type. Expected ${methodName}, got ${
                response.type
              }`
            }
          });
        }
        resolve(response as Node.MethodResponse);
      };
      setTimeout(() => {
        if (this.requestListeners[requestId] !== undefined) {
          reject(new Error(`Request timed out: ${requestId}`));
          delete this.requestListeners[requestId];
        }
      }, NODE_REQUEST_TIMEOUT);
      this.nodeProvider.sendMessage({
        requestId,
        params,
        type: methodName
      });
    });
  }

  private onNodeMessage(message: Node.Message) {
    const type = message.type;
    if (Object.values(Node.ErrorType).indexOf(type) !== -1) {
      this.handleNodeError(message as Node.Error);
    } else if ((message as Node.MethodResponse).requestId) {
      this.handleNodeMethodResponse(message as Node.MethodResponse);
    } else {
      this.handleNodeEvent(message as Node.Event);
    }
  }

  private handleNodeError(error: Node.Error) {
    const requestId = error.requestId;
    if (requestId && this.requestListeners[requestId]) {
      this.requestListeners[requestId](error);
      delete this.requestListeners[requestId];
    }
    this.eventEmitter.emit(error.type, error);
  }

  private handleNodeMethodResponse(response: Node.MethodResponse) {
    const { requestId } = response;
    if (this.requestListeners[requestId]) {
      this.requestListeners[requestId](response);
      delete this.requestListeners[requestId];
    } else {
      const error = {
        type: Node.ErrorType.ERROR,
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

  private async getOrCreateAppInstance(
    id: AppInstanceID,
    info?: AppInstanceInfo
  ): Promise<AppInstance> {
    if (!this.appInstances[id]) {
      let newInfo;
      if (info) {
        newInfo = info;
      } else {
        const { result } = await this.callNodeMethod(
          Node.MethodName.GET_APP_INSTANCE_DETAILS,
          { appInstanceId: id }
        );
        newInfo = (result as Node.GetAppInstanceDetailsResult).appInstance;
      }
      this.appInstances[id] = new AppInstance(newInfo);
    }
    return this.appInstances[id];
  }

  private async handleNodeEvent(nodeEvent: Node.Event) {
    let event: CounterfactualEvent;
    switch (nodeEvent.type) {
      case Node.EventName.REJECT_INSTALL: {
        const data = nodeEvent.data as Node.RejectInstallEventData;
        const info = data.appInstance;
        const appInstance = await this.getOrCreateAppInstance(info.id, info);
        event = {
          type: EventType.REJECT_INSTALL,
          data: {
            appInstance
          }
        };
        break;
      }
      default:
        throw new Error(
          `Unsupported event type: ${nodeEvent.type}: ${JSON.stringify(
            nodeEvent
          )}`
        );
    }
    this.eventEmitter.emit(event.type, event);
  }
}
