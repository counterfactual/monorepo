import { Address } from "@counterfactual/common-types";

export interface IMessagingService {
  send(peerAddress: Address, msg: object);
  receive(address: Address, callback: (msg: object) => void);
}
