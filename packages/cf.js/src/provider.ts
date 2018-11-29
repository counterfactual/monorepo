import cuid from "cuid";
import EventEmitter from "eventemitter3";

import { AppInstance } from "./app-instance";
import { INodeProvider, Node } from "./types";

export type EventType = Node.EventName | Node.ErrorType;

export interface Event {
  readonly type: EventType;
  readonly data: any; // TODO
}

const NODE_REQUEST_TIMEOUT = 1500;

export class Provider {
  private readonly requestListeners: {
    [requestId: string]: (msg: Node.Message) => void;
  } = {};
  private readonly eventEmitter = new EventEmitter();

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

  on(eventName: EventType, callback: (e: Event) => void) {
    this.eventEmitter.on(eventName, callback);
  }

  once(eventName: EventType, callback: (e: Event) => void) {
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
            errorName: "unexpected_message_type",
            message: `Unexpected response type. Expected ${methodName}, got ${
              response.type
            }`
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
      return this.handleNodeError(message as Node.Error);
    }
    if (Object.values(Node.MethodName).indexOf(type) !== -1) {
      return this.handleNodeMethodResponse(message as Node.MethodResponse);
    }
    if (Object.values(Node.EventName).indexOf(type) !== -1) {
      return this.handleNodeEvent(message as Node.Event);
    }
    throw new Error(`Unhandled Node message type: ${type}`);
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

  private handleNodeEvent(event: Node.Event) {
    return undefined;
  }
}
