import { Node } from "@counterfactual/types";
import "firebase/auth";
import "firebase/database";

export interface ServiceFactory {
  connect(host: string, port: string): ServiceFactory;
  auth(email: string, password: string): Promise<void>;
  createMessagingService(messagingServiceKey: string): IMessagingService;
  createStoreService(storeServiceKey: string): IStoreService;
}

export interface IMessagingService {
  send(to: string, msg: Node.NodeMessage): Promise<void>;
  onReceive(address: string, callback: (msg: Node.NodeMessage) => void);
}

export interface IStoreService {
  get(key: string): Promise<any>;
  // Multiple pairs could be written simultaneously if an atomic write
  // among multiple records is required
  set(
    pairs: { key: string; value: any }[],
    allowDelete?: Boolean
  ): Promise<boolean>;
}
