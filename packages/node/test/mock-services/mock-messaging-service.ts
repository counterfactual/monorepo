import { Address } from "@counterfactual/common-types";

import { IMessagingService } from "../../src/service-interfaces";

class MockMessagingService implements IMessagingService {
  send(peerAddress: Address, msg: object) {}
  receive(address: Address, callback: (msg: object) => void) {}
}

export const MOCK_MESSAGING_SERVICE = new MockMessagingService();
