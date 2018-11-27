export type NodeMessageReceivedCallback = (message: NodeMessage) => void;

export interface INodeProvider {
  status: NodeProviderStatus;
  onMessage(callback: NodeMessageReceivedCallback);
  postMessage(message: NodeMessage);
  connect(): Promise<INodeProvider>;
  on(messageType: NodeMessageType, callback: NodeMessageReceivedCallback);
  once(messageType: NodeMessageType, callback: NodeMessageReceivedCallback);
}

export enum NodeProviderStatus {
  OFFLINE = "offline",
  CONNECTED = "connected"
}

export enum NodeMessageType {
  INSTALL = "install",
  QUERY = "query",
  ERROR = "error"
  // Should we add a STATUS_CHANGED type to properly
  // configure the message port?
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
