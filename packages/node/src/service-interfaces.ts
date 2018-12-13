import { Address } from "@counterfactual/common-types";

export interface IMessagingService {
  send(peerAddress: Address, msg: any);
  receive(address: Address, callback: (msg: any) => void);
}

export interface IStoreService {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<boolean>;
}
