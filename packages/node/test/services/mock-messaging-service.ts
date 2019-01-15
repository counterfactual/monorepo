import { Address } from "@counterfactual/types";

import { NodeMessage } from "../../src";
import { IMessagingService } from "../../src/services";

class MockMessagingService implements IMessagingService {
  async send(respondingAddress: Address, msg: object) {}
  async onReceive(address: Address, callback: (msg: NodeMessage) => void) {}
}

const mockMessagingService = new MockMessagingService();
export default mockMessagingService;
