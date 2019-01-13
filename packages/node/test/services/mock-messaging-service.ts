import { Address } from "@counterfactual/types";

import { IMessagingService } from "../../src/services";

class MockMessagingService implements IMessagingService {
  send(respondingAddress: Address, msg: object) {}
  receive(address: Address, callback: (msg: object) => void) {}
}

const mockMessagingService = new MockMessagingService();
export default mockMessagingService;
