import { ABIEncoding, Address } from "./simple-types";

export enum NodeMessageType {
  INSTALL = "install",
  QUERY = "query",
  ERROR = "error"
}

export enum NodeQueryType {
  GET_APP_INSTANCES = "getAppInstances"
}

export interface NodeQueryData {
  queryType: NodeQueryType;
  appInstances?: any[];
}

export interface NodeMessage {
  requestId: string;
  messageType: NodeMessageType;
  data: NodeQueryData | null;
}

export interface NodeProvider {
  onMessage(callback: (message: NodeMessage) => void);
  postMessage(message: NodeMessage);
}

export interface AppDefinition {
  address: Address;
  appStateEncoding: ABIEncoding;
  appActionEncoding: ABIEncoding;
}
