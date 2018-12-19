import { Address } from "@counterfactual/common-types";

export interface IMessagingService {
  send(peerAddress: Address, msg: any);
  receive(address: Address, callback: (msg: any) => void);
}

export interface IStoreService {
  get(key: string): Promise<any>;
  // Multiple pairs could be written simultaneously if an atomic write
  // among multiple records is required
  set(pairs: { key: string; value: any }[]): Promise<boolean>;
}
