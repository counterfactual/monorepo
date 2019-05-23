import "firebase/auth";
import "firebase/database";

import { NodeMessage } from "./types";

export interface ServiceFactory {
  connect(host: string, port: string): ServiceFactory;
  auth(email: string, password: string): Promise<void>;
  createMessagingService(messagingServiceKey: string): IMessagingService;
  createStoreService(storeServiceKey: string): IStoreService;
}

export interface IMessagingService {
  send(to: string, msg: NodeMessage): Promise<void>;
  onReceive(address: string, callback: (msg: NodeMessage) => void);
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
