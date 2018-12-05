import {
  AppInstanceInfo,
  AppInstanceInstallState,
  AssetType,
  INodeProvider,
  Node
} from "@counterfactual/common-types";
import { BigNumber } from "ethers/utils";

import { AppInstance } from "../src/app-instance";
import { Provider } from "../src/provider";
import {
  CounterfactualEvent,
  ErrorEventData,
  EventType,
  InstallEventData,
  RejectInstallEventData
} from "../src/types";

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

const TEST_APP_INSTANCE_INFO: AppInstanceInfo = {
  id: "TEST_ID",
  asset: { assetType: AssetType.ETH },
  abiEncodings: { actionEncoding: "", stateEncoding: "" },
  appId: "",
  myDeposit: new BigNumber("0"),
  peerDeposit: new BigNumber("0"),
  timeout: new BigNumber("0"),
  installState: AppInstanceInstallState.INSTALLED
};

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
      expect(instances[0].id).toBe(TEST_APP_INSTANCE_INFO.id);
    });

    expect(nodeProvider.postedMessages).toHaveLength(1);
    const request = nodeProvider.postedMessages[0] as Node.MethodRequest;
    expect(request.type).toBe(Node.MethodName.GET_APP_INSTANCES);

    nodeProvider.simulateMessageFromNode({
      type: Node.MethodName.GET_APP_INSTANCES,
      requestId: request.requestId,
      result: {
        appInstances: [TEST_APP_INSTANCE_INFO]
      }
    });
  });

  it("should emit an error event for orphaned responses", async () => {
    expect.assertions(2);
    provider.on(EventType.ERROR, e => {
      expect(e.type).toBe(EventType.ERROR);
      expect((e.data as ErrorEventData).errorName).toBe("orphaned_response");
    });
    nodeProvider.simulateMessageFromNode({
      type: Node.MethodName.INSTALL,
      requestId: "test",
      result: {
        appInstanceId: ""
      }
    });
  });

  it("should throw an error on timeout", async () => {
    try {
      await provider.getAppInstances();
    } catch (err) {
      expect(err.type).toBe(EventType.ERROR);
      expect(err.data.errorName).toBe("request_timeout");
    }
  });

  it("should unsubscribe from events", async done => {
    const callback = (e: CounterfactualEvent) => {
      done.fail("Unsubscribed event listener was fired");
    };
    provider.on(EventType.REJECT_INSTALL, callback);
    provider.off(EventType.REJECT_INSTALL, callback);
    nodeProvider.simulateMessageFromNode({
      type: Node.MethodName.REJECT_INSTALL,
      requestId: "1",
      result: {
        appInstanceId: "TEST"
      }
    });
    setTimeout(done, 100);
  });

  it("should correctly subscribe to rejectInstall events", async () => {
    expect.assertions(3);
    provider.once(EventType.REJECT_INSTALL, e => {
      expect(e.type).toBe(EventType.REJECT_INSTALL);
      const appInstance = (e.data as RejectInstallEventData).appInstance;
      expect(appInstance).toBeInstanceOf(AppInstance);
      expect(appInstance.id).toBe(TEST_APP_INSTANCE_INFO.id);
    });
    nodeProvider.simulateMessageFromNode({
      type: Node.EventName.REJECT_INSTALL,
      data: {
        appInstance: TEST_APP_INSTANCE_INFO
      }
    });
  });

  it("should expose the same AppInstance instance for a unique app instance ID", async () => {
    expect.assertions(1);
    let savedInstance: AppInstance;
    provider.on(EventType.REJECT_INSTALL, e => {
      const eventInstance = (e.data as RejectInstallEventData).appInstance;
      if (!savedInstance) {
        savedInstance = eventInstance;
      } else {
        expect(savedInstance).toBe(eventInstance);
      }
    });
    const msg = {
      type: Node.EventName.REJECT_INSTALL,
      data: {
        appInstance: TEST_APP_INSTANCE_INFO
      }
    };
    nodeProvider.simulateMessageFromNode(msg);
    nodeProvider.simulateMessageFromNode(msg);
  });

  it("should load app instance details on-demand", async () => {
    expect.assertions(4);

    provider.on(EventType.UPDATE_STATE, e => {
      expect((e.data as InstallEventData).appInstance.id).toBe(
        TEST_APP_INSTANCE_INFO.id
      );
    });

    nodeProvider.simulateMessageFromNode({
      type: Node.EventName.UPDATE_STATE,
      data: {
        appInstanceId: TEST_APP_INSTANCE_INFO.id,
        oldState: "4",
        action: "-1",
        newState: "3"
      }
    });
    expect(nodeProvider.postedMessages).toHaveLength(1);
    const detailsRequest = nodeProvider.postedMessages[0] as Node.MethodRequest;
    expect(detailsRequest.type).toBe(Node.MethodName.GET_APP_INSTANCE_DETAILS);
    expect(
      (detailsRequest.params as Node.GetAppInstanceDetailsParams).appInstanceId
    ).toBe(TEST_APP_INSTANCE_INFO.id);
    nodeProvider.simulateMessageFromNode({
      type: Node.MethodName.GET_APP_INSTANCE_DETAILS,
      requestId: detailsRequest.requestId,
      result: {
        appInstance: TEST_APP_INSTANCE_INFO
      }
    });
    // NOTE: For some reason the event won't fire unless we wait for a bit
    await new Promise(r => setTimeout(r, 50));
  });

  it("should throw an error for unexpected event types", async () => {
    expect.assertions(2);

    provider.on(EventType.ERROR, e => {
      expect(e.type).toBe(EventType.ERROR);
      expect((e.data as ErrorEventData).errorName).toBe(
        "unexpected_event_type"
      );
    });

    nodeProvider.simulateMessageFromNode(({
      type: "notARealEventType"
    } as unknown) as Node.Event);
  });
});
