import cuid from "cuid";

import { AppInstance } from "./app-instance";
import {
  GetAppInstancesResult,
  INodeProvider,
  NodeErrorType,
  NodeEventName,
  NodeMessage,
  NodeMethodName,
  NodeMethodParams,
  NodeMethodResponse
} from "./types";

export interface CfEvent {
  readonly type: NodeEventName;
  readonly data: any; // TODO
}

const NODE_REQUEST_TIMEOUT = 1500;

export class Provider {
  private readonly requestListeners: {
    [requestId: string]: (msg: NodeMessage) => void;
  } = {};

  constructor(readonly nodeProvider: INodeProvider) {
    this.nodeProvider.onMessage(this.onNodeMessage.bind(this));
  }

  async getAppInstances(): Promise<AppInstance[]> {
    const response = await this.callNodeMethod(
      NodeMethodName.GET_APP_INSTANCES,
      {}
    );
    const result = response.result as GetAppInstancesResult;
    return result.appInstances.map(info => new AppInstance(info));
  }

  on(eventName: NodeEventName, callback: (e: CfEvent) => void) {
    // TODO: support notification observers
  }

  private async callNodeMethod(
    methodName: NodeMethodName,
    params: NodeMethodParams
  ): Promise<NodeMethodResponse> {
    const requestId = cuid();
    return new Promise<NodeMethodResponse>((resolve, reject) => {
      this.requestListeners[requestId] = response => {
        if (response.type === NodeErrorType.ERROR) {
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
        resolve(response as NodeMethodResponse);
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

  private onNodeMessage(message: NodeMessage) {
    const requestId = (message as NodeMethodResponse).requestId;
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
