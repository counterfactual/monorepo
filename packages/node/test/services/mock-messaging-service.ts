import { Address } from "@counterfactual/types";

import { NodeMessage } from "../../src";
import { IMessagingService } from "../../src/services";

class MockMessagingService implements IMessagingService {
  send(respondingAddress: Address, msg: object) {}
  async onReceive(
    address: Address,
    callback: (msg: NodeMessage) => Promise<void>
  ) {}
}

const mockMessagingService = new MockMessagingService();
export default mockMessagingService;
