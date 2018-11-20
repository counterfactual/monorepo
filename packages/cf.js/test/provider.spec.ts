import {
  NodeMessageType,
  NodeQueryData,
  QueryType
} from "@counterfactual/node-provider";

import { AppInstance } from "../src/app-instance";
import { Provider } from "../src/provider";

import { TestNodeProvider } from "./fixture";

describe("CF.js Provider", async () => {
  let nodeProvider: TestNodeProvider;
  let provider: Provider;

  beforeEach(() => {
    nodeProvider = new TestNodeProvider();
    provider = new Provider(nodeProvider);
  });

  it("should respond correctly to errors", async () => {
    nodeProvider.listenForIncomingMessage(0, message => {
      expect(message.messageType).toBe(NodeMessageType.QUERY);
      const queryData = message.data! as NodeQueryData;
      expect(queryData.queryType).toBe(QueryType.GET_APP_INSTANCES);

      return {
        requestId: message.requestId,
        messageType: NodeMessageType.ERROR,
        data: { message: "Music too loud" }
      };
    });

    try {
      await provider.getAppInstances();
    } catch (e) {
      expect(e.data.message).toBe("Music too loud");
    }
  });

  it("should query app instances and return them", async () => {
    const testInstance = new AppInstance("TEST_ID");

    nodeProvider.listenForIncomingMessage(0, message => {
      expect(message.messageType).toBe(NodeMessageType.QUERY);
      const queryData = message.data! as NodeQueryData;
      expect(queryData.queryType).toBe(QueryType.GET_APP_INSTANCES);

      return {
        requestId: message.requestId,
        messageType: NodeMessageType.QUERY,
        data: {
          queryType: QueryType.GET_APP_INSTANCES,
          appInstances: [testInstance]
        }
      };
    });

    const instances = await provider.getAppInstances();

    expect(instances).toHaveLength(1);
    expect(instances[0].id).toBe(testInstance.id);
  });
});
