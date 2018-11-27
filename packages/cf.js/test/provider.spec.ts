import { BigNumber } from "ethers/utils";

import { AppInstance } from "../src/app-instance";
import { Provider } from "../src/provider";
import { AssetType, NodeMethodRequest } from "../src/types";
import {
  INodeProvider,
  NodeErrorType,
  NodeMessage,
  NodeMethodName,
  NodeMethodResponse
} from "../src/types/node-protocol";

class TestNodeProvider implements INodeProvider {
  public postedMessages: NodeMessage[] = [];
  readonly callbacks: ((message: NodeMessage) => void)[] = [];

  public simulateMessageFromNode(message: NodeMessage) {
    this.callbacks.forEach(cb => cb(message));
  }

  public onMessage(callback: (message: NodeMessage) => void) {
    this.callbacks.push(callback);
  }

  public sendMessage(message: NodeMessage) {
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

  it("should respond correctly to a generic error", async () => {
    expect.assertions(3);
    const promise = provider.getAppInstances();

    expect(nodeProvider.postedMessages).toHaveLength(1);

    const request = nodeProvider.postedMessages[0] as NodeMethodResponse;
    expect(request.type).toBe(NodeMethodName.GET_APP_INSTANCES);

    nodeProvider.simulateMessageFromNode({
      requestId: request.requestId,
      type: NodeErrorType.ERROR,
      data: { errorName: "music_too_loud", message: "Music too loud" }
    });

    try {
      await promise;
    } catch (e) {
      expect(e.message).toBe("Music too loud");
    }
  });

  it("should respond correctly to message type mismatch", async () => {
    expect.assertions(3);
    const promise = provider.getAppInstances();

    expect(nodeProvider.postedMessages).toHaveLength(1);

    const request = nodeProvider.postedMessages[0] as NodeMethodResponse;
    expect(request.type).toBe(NodeMethodName.GET_APP_INSTANCES);

    nodeProvider.simulateMessageFromNode({
      requestId: request.requestId,
      type: NodeMethodName.PROPOSE_INSTALL,
      result: { appInstanceId: "" }
    });

    try {
      await promise;
    } catch (e) {
      expect(e.errorName).toBe("unexpected_message_type");
    }
  });

  it("should query app instances and return them", async () => {
    expect.assertions(4);
    const testInstance = new AppInstance({
      id: "TEST_ID",
      asset: { assetType: AssetType.ETH },
      abiEncodings: { actionEncoding: "", stateEncoding: "" },
      appId: "",
      myDeposit: new BigNumber("0"),
      peerDeposit: new BigNumber("0"),
      timeout: new BigNumber("0")
    });

    provider.getAppInstances().then(instances => {
      expect(instances).toHaveLength(1);
      expect(instances[0].id).toBe(testInstance.id);
    });

    expect(nodeProvider.postedMessages).toHaveLength(1);
    const request = nodeProvider.postedMessages[0] as NodeMethodRequest;
    expect(request.type).toBe(NodeMethodName.GET_APP_INSTANCES);

    nodeProvider.simulateMessageFromNode({
      type: NodeMethodName.GET_APP_INSTANCES,
      requestId: request.requestId,
      result: {
        appInstances: [testInstance.info]
      }
    });
  });
});
