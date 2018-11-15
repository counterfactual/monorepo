import { ABIEncoding, Address } from "./simple-types";

export enum NodeMessageType {
  INSTALL = "install",
  QUERY = "query"
}

export interface NodeMessage {
  requestId: string;
  messageType: NodeMessageType;
  data: any; // TODO
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
