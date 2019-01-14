import { Address } from "@counterfactual/types";

import { NodeMessage } from "../../src";
import { IMessagingService } from "../../src/services";

class MockMessagingService implements IMessagingService {
  send(respondingAddress: Address, msg: object) {}
  async receive(
    address: Address,
    callback: (msg: NodeMessage) => Promise<void>
  ) {}
}

const mockMessagingService = new MockMessagingService();
export default mockMessagingService;
