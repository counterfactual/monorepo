import * as uuid from "uuid";

import { AppFactory } from "./app-factory";
import { AppInstance } from "./app-instance";
import {
  AppDefinition,
  MessageDataQuery,
  NodeMessage,
  NodeMessageType,
  NodeProvider,
  QueryType
} from "./structs";

export enum ClientEventType {
  INSTALL = "cf_install",
  PROPOSE_INSTALL = "cf_proposeInstall",
  REJECT_INSTALL = "cf_rejectInstall"
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
    const response = await this.sendNodeRequest(NodeMessageType.QUERY, {
      queryType: QueryType.GET_APP_INSTANCES
    });
    return (response.data as MessageDataQuery).appInstances!.map(
      ({ id }) => new AppInstance(id)
    );
  }

  createAppFactory(appDefinition: AppDefinition): AppFactory {
    return new AppFactory(appDefinition);
  }

  on(eventType: ClientEventType, callback: (e: ClientEvent) => void) {
    // TODO: support notification observers
  }

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
