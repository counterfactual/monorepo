export interface INodeProvider {
  onMessage(callback: (message: NodeMessage) => void);
  postMessage(message: NodeMessage);
}

export enum NodeMessageType {
  PROPOSE_INSTALL = "proposeInstall",
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

export interface NodeInstallProposalData {
  appInstanceId?: string;
  assetType: number;
  token?: string;
  peerAddress: string;
  myDeposit: string;
  peerDeposit: string;
  appDefinition: object;
  initialState: object;
}

export type NodeMessageData =
  | NodeQueryData
  | NodeErrorData
  | NodeInstallProposalData
  | null;

export interface NodeMessage {
  requestId: string;
  messageType: NodeMessageType;
  data: NodeMessageData;
}
