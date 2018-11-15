import { AppInstance } from "../src/app-instance";
import { Client, ClientEventType } from "../src/client";
import { NodeMessage, NodeMessageType, NodeProvider } from "../src/structs";

class TestNodeProvider implements NodeProvider {
  public postedMessages: NodeMessage[] = [];
  readonly callbacks: ((message: NodeMessage) => void)[] = [];

  public simulateMessageFromNode(message: NodeMessage) {
    this.callbacks.forEach(cb => cb(message));
  }

  public onMessage(callback: (message: NodeMessage) => void) {
    this.callbacks.push(callback);
  }

  public postMessage(message: NodeMessage) {
    this.postedMessages.push(message);
  }
}

describe("CF.js Client", async () => {
  let nodeProvider: TestNodeProvider;
  let client: Client;

  beforeEach(() => {
    nodeProvider = new TestNodeProvider();
    client = new Client(nodeProvider);
  });

  it("should notify listeners about install events", async () => {
    expect.assertions(1);

    client.on(ClientEventType.INSTALL, e => {
      expect(e.eventType).toBe(ClientEventType.INSTALL);
    });

    nodeProvider.simulateMessageFromNode({
      requestId: "1",
      messageType: NodeMessageType.INSTALL,
      data: null
    });
  });

  it("should query app instances and return them", async () => {
    expect.assertions(5);
    const testInstance = new AppInstance("TEST_ID");

    client.getAppInstances().then(instances => {
      expect(instances).toHaveLength(1);
      expect(instances[0].id).toBe(testInstance.id);
    });

    expect(nodeProvider.postedMessages).toHaveLength(1);
    const queryMessage = nodeProvider.postedMessages[0];
    expect(queryMessage.messageType).toBe(NodeMessageType.QUERY);
    expect(queryMessage.data.queryType).toBe("allAppInstances"); // TODO

    nodeProvider.simulateMessageFromNode({
      requestId: queryMessage.requestId,
      messageType: NodeMessageType.QUERY,
      data: {
        appInstances: [testInstance]
      }
    });
  });
});
