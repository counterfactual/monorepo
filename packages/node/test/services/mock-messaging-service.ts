import { IMessagingService } from "../../src/services";
import { NodeMessage } from "../../src/types";

class MockMessagingService implements IMessagingService {
  async send(to: string, msg: NodeMessage) {}
  onReceive(address: string, callback: (msg: NodeMessage) => void) {}
}

const mockMessagingService = new MockMessagingService();
export default mockMessagingService;
