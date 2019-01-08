import { Address } from "@counterfactual/types";

import { IMessagingService } from "../../src/services";

class MockMessagingService implements IMessagingService {
  send(peerAddress: Address, msg: object) {}
  receive(address: Address, callback: (msg: object) => void) {}
}

const MOCK_MESSAGING_SERVICE = new MockMessagingService();
export default MOCK_MESSAGING_SERVICE;
