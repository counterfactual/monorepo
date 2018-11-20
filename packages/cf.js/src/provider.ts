import {
  INodeProvider,
  NodeMessage,
  NodeMessageData,
  NodeMessageType,
  NodeQueryData,
  QueryType
} from "@counterfactual/node-provider";

import * as uuid from "uuid";

import { AppFactory } from "./app-factory";
import { AppInstance } from "./app-instance";
import { AppDefinition, AppInstallProposal } from "./app-types";

export enum CounterfactualEventType {
  INSTALL = "cf_install",
  PROPOSE_INSTALL = "cf_proposeInstall",
  REJECT_INSTALL = "cf_rejectInstall"
}

export interface InstallProposalData {
  proposal: AppInstallProposal;

  reject();
}

export type CounterfactualEventData = InstallProposalData | null;

export interface CounterfactualEvent {
  readonly eventType: CounterfactualEventType;
  readonly data: CounterfactualEventData;
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
    const response = await this.sendRawNodeRequest(NodeMessageType.QUERY, {
      queryType: QueryType.GET_APP_INSTANCES
    });
    return (response.data as NodeQueryData).appInstances!.map(
      ({ id }) => new AppInstance(id)
    );
  }

  createAppFactory(appDefinition: AppDefinition): AppFactory {
    return new AppFactory(this, appDefinition);
  }

  on(
    eventType: CounterfactualEventType,
    callback: (e: CounterfactualEvent) => void
  ) {
    // TODO: support notification observers
  }

  async sendRawNodeRequest(
    messageType: NodeMessageType,
    data: NodeMessageData
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
