export type NodeMessageReceivedCallback = (message: NodeMessage) => void;

export interface INodeProvider {
  onMessage(callback: NodeMessageReceivedCallback);
  emit(message: NodeMessage);
  connect(): Promise<INodeProvider>;
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

// TODO: See how these interfaces are split in a Request/Response-ish way.
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
