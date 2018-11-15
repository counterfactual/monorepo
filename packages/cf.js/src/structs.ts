import { ABIEncoding, Address } from "./simple-types";

export enum NodeMessageType {
  INSTALL = "install",
  QUERY = "query",
  ERROR = "error"
}

export enum QueryType {
  GET_APP_INSTANCES = "getAppInstances"
}

export interface MessageDataQuery {
  queryType: QueryType;
  appInstances?: any[];
}

export interface MessageDataError {
  message: string;
  extra?: any;
}

export interface NodeMessage {
  requestId: string;
  messageType: NodeMessageType;
  data: MessageDataQuery | MessageDataError | null;
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
