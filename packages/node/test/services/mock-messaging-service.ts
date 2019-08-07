import { Node } from "@counterfactual/types";

class MockMessagingService implements Node.IMessagingService {
  async send() {}
  onReceive() {}
}

export default new MockMessagingService();
