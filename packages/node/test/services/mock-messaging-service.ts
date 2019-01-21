import { Address } from "@counterfactual/types";

import { IMessagingService } from "../../src/services";
import { NodeMessage } from "../../src/types";

class MockMessagingService implements IMessagingService {
  async send(respondingAddress: Address, msg: NodeMessage) {}
  onReceive(address: Address, callback: (msg: NodeMessage) => void) {}
}

const mockMessagingService = new MockMessagingService();
export default mockMessagingService;
