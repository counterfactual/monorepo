import * as uuid from "uuid";

import { AppFactory } from "./app-factory";
import { AppInstance } from "./app-instance";
import {
  AppDefinition,
  NodeMessage,
  NodeMessageType,
  NodeProvider,
  NodeQueryData,
  NodeQueryType
} from "./structs";

export enum ClientEventType {
  INSTALL = "install",
  PROPOSE_INSTALL = "proposeInstall",
  REJECT_INSTALL = "rejectInstall"
}

export interface ClientEvent {
  readonly eventType: ClientEventType;
  readonly data: any; // TODO
}

const NODE_REQUEST_TIMEOUT = 1500;

export class Client {
  private readonly requestListeners: {
    [requestId: string]: (msg: NodeMessage) => void;
  } = {};

  constructor(readonly nodeProvider: NodeProvider) {
    this.nodeProvider.onMessage(this.onNodeMessage.bind(this));
  }

  async getAppInstances(): Promise<AppInstance[]> {
    const queryData: NodeQueryData = {
      queryType: NodeQueryType.GET_APP_INSTANCES
    };
    const response = await this.sendNodeRequest(
      NodeMessageType.QUERY,
      queryData
    );
    return (response.data as NodeQueryData).appInstances!.map(
      ({ id }) => new AppInstance(id)
    );
  }

  createAppFactory(appDefinition: AppDefinition): AppFactory {
    return new AppFactory(appDefinition);
  }

  on(eventType: ClientEventType, callback: (e: ClientEvent) => void) {}

  private async sendNodeRequest(
    messageType: NodeMessageType,
    data: any
  ): Promise<NodeMessage> {
    const requestId = uuid.v4();
    return new Promise<NodeMessage>((resolve, reject) => {
      this.requestListeners[requestId] = msg => {
        if (msg.messageType === NodeMessageType.ERROR) {
          return reject(msg);
        }
        resolve(msg);
      };
      setTimeout(() => {
        if (this.requestListeners[requestId] !== undefined) {
          reject(new Error(`Request timed out: ${requestId}`));
          delete this.requestListeners[requestId];
        }
      }, NODE_REQUEST_TIMEOUT);
      this.nodeProvider.postMessage({
        requestId,
        messageType,
        data
      });
    });
  }

  private onNodeMessage(message: NodeMessage) {
    const { requestId } = message;
    if (this.requestListeners[requestId]) {
      this.requestListeners[requestId](message);
      delete this.requestListeners[requestId];
    }
    // TODO: notify observers
  }
}
