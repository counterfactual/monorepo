import { Address } from "@counterfactual/common-types";

import { IMessagingService } from "@counterfactual/node";

export default class MessagingService implements IMessagingService {
  send(peerAddress: Address, msg: object) {
    console.log("[MessagingService:send]", `[peerAddress:${peerAddress}`, "[msg:", msg, "]");
  }
  receive(address: Address, callback: (msg: object) => void) {
    console.log("[MessagingService:receive]", `[address:${address}`);
  }
}
