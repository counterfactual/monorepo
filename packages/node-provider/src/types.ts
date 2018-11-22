export interface INodeProvider {
  onMessage(callback: (message: NodeMessage) => void);
  postMessage(message: NodeMessage);
}

export enum NodeMessageType {
  INSTALL = "install",
  QUERY = "query",
  ERROR = "error"
}

export enum QueryType {
  GET_APP_INSTANCES = "getAppInstances"
}

export interface AppInstanceInfo {
  id: string;
}

export interface NodeQueryData {
  queryType: QueryType;
  appInstances?: AppInstanceInfo[];
}

export interface NodeErrorData {
  message: string;
  extra?: { [key: string]: any };
}

export interface NodeMessage {
  requestId: string;
  messageType: NodeMessageType;
  data: NodeQueryData | NodeErrorData | null;
}
