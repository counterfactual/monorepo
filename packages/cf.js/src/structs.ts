import { NodeMessage } from "./messaging";
import { ABIEncoding, Address } from "./simple-types";

export interface NodeProvider {
  onMessage(callback: (message: NodeMessage) => void);
  postMessage(message: NodeMessage);
}

export interface AppDefinition {
  address: Address;
  appStateEncoding: ABIEncoding;
  appActionEncoding: ABIEncoding;
}
