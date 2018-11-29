import { BigNumber } from "ethers/utils";

import { AppInstance } from "../src/app-instance";
import { Provider } from "../src/provider";
import { AssetType, INodeProvider, Node } from "../src/types";

class TestNodeProvider implements INodeProvider {
  public postedMessages: Node.Message[] = [];
  readonly callbacks: ((message: Node.Message) => void)[] = [];

  public simulateMessageFromNode(message: Node.Message) {
    this.callbacks.forEach(cb => cb(message));
  }

  public onMessage(callback: (message: Node.Message) => void) {
    this.callbacks.push(callback);
  }

  public sendMessage(message: Node.Message) {
    this.postedMessages.push(message);
  }
}

const TEST_INSTANCE = new AppInstance({
  id: "TEST_ID",
  asset: { assetType: AssetType.ETH },
  abiEncodings: { actionEncoding: "", stateEncoding: "" },
  appId: "",
  myDeposit: new BigNumber("0"),
  peerDeposit: new BigNumber("0"),
  timeout: new BigNumber("0")
});
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

    const request = nodeProvider.postedMessages[0] as Node.MethodResponse;
    expect(request.type).toBe(Node.MethodName.GET_APP_INSTANCES);

    nodeProvider.simulateMessageFromNode({
      requestId: request.requestId,
      type: Node.ErrorType.ERROR,
      data: { errorName: "music_too_loud", message: "Music too loud" }
    });

    try {
      await promise;
    } catch (e) {
      expect(e.data.message).toBe("Music too loud");
    }
  });

  it("should respond correctly to message type mismatch", async () => {
    expect.assertions(3);
    const promise = provider.getAppInstances();

    expect(nodeProvider.postedMessages).toHaveLength(1);

    const request = nodeProvider.postedMessages[0] as Node.MethodRequest;
    expect(request.type).toBe(Node.MethodName.GET_APP_INSTANCES);

    nodeProvider.simulateMessageFromNode({
      requestId: request.requestId,
      type: Node.MethodName.PROPOSE_INSTALL,
      result: { appInstanceId: "" }
    });

    try {
      await promise;
    } catch (e) {
      expect(e.data.errorName).toBe("unexpected_message_type");
    }
  });

  it("should query app instances and return them", async () => {
    expect.assertions(4);

    provider.getAppInstances().then(instances => {
      expect(instances).toHaveLength(1);
      expect(instances[0].id).toBe(TEST_INSTANCE.id);
    });

    expect(nodeProvider.postedMessages).toHaveLength(1);
    const request = nodeProvider.postedMessages[0] as Node.MethodRequest;
    expect(request.type).toBe(Node.MethodName.GET_APP_INSTANCES);

    nodeProvider.simulateMessageFromNode({
      type: Node.MethodName.GET_APP_INSTANCES,
      requestId: request.requestId,
      result: {
        appInstances: [TEST_INSTANCE.info]
      }
    });
  });

  it("should correctly subscribe to events", async () => {
    expect.assertions(1);
    provider.once(Node.EventName.INSTALL, e => {
      expect(e.type).toBe(Node.EventName.INSTALL);
    });
    nodeProvider.simulateMessageFromNode({
      type: Node.EventName.INSTALL,
      data: {
        appInstance: TEST_INSTANCE.info
      }
    });
  });
});
