import { Address } from "@counterfactual/common-types";

export interface IMessagingService {
  send(peerAddress: Address, msg: object);
  receive(address: Address, callback: (msg: object) => void);
}

export interface IStoreService {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<boolean>;
  add(key: string, value: any): Promise<boolean>;
}
