import { Address } from "@counterfactual/types";

import { NodeEvents, NodeMessage } from "../../src";
import { IMessagingService } from "../../src/services";

class MockMessagingService implements IMessagingService {
  async send(respondingAddress: Address, msg: object) {}
  onReceive(address: Address, callback: (msg: NodeMessage) => void) {
    callback({
      from: address,
      event: "mock value that triggers no-op error in preProcess" as NodeEvents
    });
  }
}

const mockMessagingService = new MockMessagingService();
export default mockMessagingService;
