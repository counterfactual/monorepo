import {
  INodeProvider,
  NodeMessage,
  NodeMessageType,
  NodeQueryData,
  QueryType
} from "@counterfactual/node-provider";

import { AppInstance } from "../src/app-instance";
import { Provider } from "../src/provider";

class TestNodeProvider implements INodeProvider {
  public postedMessages: NodeMessage[] = [];
  readonly callbacks: ((message: NodeMessage) => void)[] = [];

  public sendMessageToClient(message: NodeMessage) {
    this.callbacks.forEach(cb => cb(message));
  }

  public onMessage(callback: (message: NodeMessage) => void) {
    this.callbacks.push(callback);
  }

  public postMessage(message: NodeMessage) {
    this.postedMessages.push(message);
  }
}

describe("CF.js Provider", async () => {
  let nodeProvider: TestNodeProvider;
  let provider: Provider;

  beforeEach(() => {
    nodeProvider = new TestNodeProvider();
    provider = new Provider(nodeProvider);
  });

  it("should respond correctly to errors", async () => {
    expect.assertions(4);
    const promise = provider.getAppInstances();

    expect(nodeProvider.postedMessages).toHaveLength(1);
    const queryMessage = nodeProvider.postedMessages[0];

    expect(queryMessage.messageType).toBe(NodeMessageType.QUERY);
    const queryData = queryMessage.data! as NodeQueryData;
    expect(queryData.queryType).toBe(QueryType.GET_APP_INSTANCES);

    nodeProvider.sendMessageToClient({
      requestId: queryMessage.requestId,
      messageType: NodeMessageType.ERROR,
      data: { message: "Music too loud" }
    });

    try {
      await promise;
    } catch (e) {
      expect(e.data.message).toBe("Music too loud");
    }
  });

  it("should query app instances and return them", async () => {
    expect.assertions(5);
    const testInstance = new AppInstance("TEST_ID");

    provider.getAppInstances().then(instances => {
      expect(instances).toHaveLength(1);
      expect(instances[0].id).toBe(testInstance.id);
    });

    expect(nodeProvider.postedMessages).toHaveLength(1);
    const queryMessage = nodeProvider.postedMessages[0];
    expect(queryMessage.messageType).toBe(NodeMessageType.QUERY);
    const queryData = queryMessage.data as NodeQueryData;
    expect(queryData.queryType).toBe(QueryType.GET_APP_INSTANCES);

    nodeProvider.sendMessageToClient({
      requestId: queryMessage.requestId,
      messageType: NodeMessageType.QUERY,
      data: {
        queryType: QueryType.GET_APP_INSTANCES,
        appInstances: [testInstance]
      }
    });
  });
});
