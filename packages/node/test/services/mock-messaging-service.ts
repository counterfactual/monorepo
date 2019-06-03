import { Node } from "@counterfactual/types";

import { IMessagingService } from "../../src/services";

class MockMessagingService implements IMessagingService {
  async send(to: string, msg: Node.NodeMessage) {}
  onReceive(address: string, callback: (msg: Node.NodeMessage) => void) {}
}

const mockMessagingService = new MockMessagingService();
export default mockMessagingService;
