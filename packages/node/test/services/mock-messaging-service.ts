import { Node } from "@counterfactual/types";

class MockMessagingService implements Node.IMessagingService {
  async send(to: string, msg: Node.NodeMessage) {}
  onReceive(address: string, callback: (msg: Node.NodeMessage) => void) {}
}

const mockMessagingService = new MockMessagingService();
export default mockMessagingService;
