import cuid from "cuid";

import { AppInstance } from "./app-instance";
import { INodeProvider, Node } from "./types";

export import DappEventType = Node.EventName;

export interface DappEvent {
  readonly type: DappEventType;
  readonly data: any; // TODO
}

const NODE_REQUEST_TIMEOUT = 1500;

export class Provider {
  private readonly requestListeners: {
    [requestId: string]: (msg: Node.Message) => void;
  } = {};

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

  on(eventName: DappEventType, callback: (e: DappEvent) => void) {
    // TODO: support notification observers
  }

  private async callNodeMethod(
    methodName: Node.MethodName,
    params: Node.MethodParams
  ): Promise<Node.MethodResponse> {
    const requestId = cuid();
    return new Promise<Node.MethodResponse>((resolve, reject) => {
      this.requestListeners[requestId] = response => {
        if (response.type === Node.ErrorType.ERROR) {
          return reject(response.data);
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
    const requestId = (message as Node.MethodResponse).requestId;
    if (requestId) {
      if (this.requestListeners[requestId]) {
        this.requestListeners[requestId](message);
        delete this.requestListeners[requestId];
      }
    } else {
      // TODO: notify observers
    }
  }
}
