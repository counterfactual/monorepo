import { AppInstanceInfo, AssetType, Node } from "@counterfactual/types";
import { Zero } from "ethers/constants";

import { AppInstance } from "../src/app-instance";
import { Provider } from "../src/provider";
import {
  CounterfactualEvent,
  ErrorEventData,
  EventType,
  InstallEventData,
  RejectInstallEventData
} from "../src/types";

import { TestNodeProvider } from "./fixture";

describe("CF.js Provider", () => {
  let nodeProvider: TestNodeProvider;
  let provider: Provider;

  const TEST_APP_INSTANCE_INFO: AppInstanceInfo = {
    id: "TEST_ID",
    asset: { assetType: AssetType.ETH },
    abiEncodings: { actionEncoding: "uint256", stateEncoding: "uint256" },
    appId: "0x1515151515151515151515151515151515151515",
    myDeposit: Zero,
    peerDeposit: Zero,
    timeout: Zero
  };

  beforeEach(() => {
    nodeProvider = new TestNodeProvider();
    provider = new Provider(nodeProvider);
  });

  it("throws generic errors coming from Node", async () => {
    expect.assertions(2);

    nodeProvider.onMethodRequest(Node.MethodName.GET_APP_INSTANCES, request => {
      expect(request.type).toBe(Node.MethodName.GET_APP_INSTANCES);

      nodeProvider.simulateMessageFromNode({
        requestId: request.requestId,
        type: Node.ErrorType.ERROR,
        data: { errorName: "music_too_loud", message: "Music too loud" }
      });
    });

    try {
      await provider.getAppInstances();
    } catch (e) {
      expect(e.data.message).toBe("Music too loud");
    }
  });

  it("throws an error on message type mismatch", async () => {
    expect.assertions(2);

    nodeProvider.onMethodRequest(Node.MethodName.GET_APP_INSTANCES, request => {
      expect(request.type).toBe(Node.MethodName.GET_APP_INSTANCES);

      nodeProvider.simulateMessageFromNode({
        requestId: request.requestId,
        type: Node.MethodName.PROPOSE_INSTALL,
        result: { appInstanceId: "" }
      });
    });

    try {
      await provider.getAppInstances();
    } catch (e) {
      expect(e.data.errorName).toBe("unexpected_message_type");
    }
  });

  it("emits an error event for orphaned responses", async () => {
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

  it("throws an error on timeout", async () => {
    try {
      await provider.getAppInstances();
    } catch (err) {
      expect(err.type).toBe(EventType.ERROR);
      expect(err.data.errorName).toBe("request_timeout");
    }
  });

  it("throws an error for unexpected event types", async () => {
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

  describe("Node methods", () => {
    it("can query app instances and return them", async () => {
      expect.assertions(3);
      nodeProvider.onMethodRequest(
        Node.MethodName.GET_APP_INSTANCES,
        request => {
          expect(request.type).toBe(Node.MethodName.GET_APP_INSTANCES);

          nodeProvider.simulateMessageFromNode({
            type: Node.MethodName.GET_APP_INSTANCES,
            requestId: request.requestId,
            result: {
              appInstances: [TEST_APP_INSTANCE_INFO]
            }
          });
        }
      );

      const instances = await provider.getAppInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].id).toBe(TEST_APP_INSTANCE_INFO.id);
    });

    it("can install an app instance", async () => {
      expect.assertions(4);
      nodeProvider.onMethodRequest(Node.MethodName.INSTALL, request => {
        expect(request.type).toBe(Node.MethodName.INSTALL);
        expect((request.params as Node.InstallParams).appInstanceId).toBe(
          TEST_APP_INSTANCE_INFO.id
        );
        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.INSTALL,
          requestId: request.requestId,
          result: {
            appInstance: TEST_APP_INSTANCE_INFO
          }
        });
      });
      const appInstance = await provider.install(TEST_APP_INSTANCE_INFO.id);
      expect(appInstance.id).toBe(TEST_APP_INSTANCE_INFO.id);
      expect(appInstance.appId).toBe(TEST_APP_INSTANCE_INFO.appId);
    });

    it("can install an app instance virtually", async () => {
      expect.assertions(7);
      const expectedIntermediaries = [
        "0x6001600160016001600160016001600160016001"
      ];

      nodeProvider.onMethodRequest(Node.MethodName.INSTALL_VIRTUAL, request => {
        expect(request.type).toBe(Node.MethodName.INSTALL_VIRTUAL);
        const params = request.params as Node.InstallVirtualParams;
        expect(params.appInstanceId).toBe(TEST_APP_INSTANCE_INFO.id);
        expect(params.intermediaries).toBe(expectedIntermediaries);

        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.INSTALL_VIRTUAL,
          requestId: request.requestId,
          result: {
            appInstance: {
              intermediaries: expectedIntermediaries,
              ...TEST_APP_INSTANCE_INFO
            }
          }
        });
      });
      const appInstance = await provider.installVirtual(
        TEST_APP_INSTANCE_INFO.id,
        expectedIntermediaries
      );
      expect(appInstance.id).toBe(TEST_APP_INSTANCE_INFO.id);
      expect(appInstance.appId).toBe(TEST_APP_INSTANCE_INFO.appId);
      expect(appInstance.isVirtual).toBeTruthy();
      expect(appInstance.intermediaries).toBe(expectedIntermediaries);
    });

    it("can reject installation proposals", async () => {
      nodeProvider.onMethodRequest(Node.MethodName.REJECT_INSTALL, request => {
        expect(request.type).toBe(Node.MethodName.REJECT_INSTALL);
        const { appInstanceId } = request.params as Node.RejectInstallParams;
        expect(appInstanceId).toBe(TEST_APP_INSTANCE_INFO.id);
        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.REJECT_INSTALL,
          requestId: request.requestId,
          result: {}
        });
      });
      await provider.rejectInstall(TEST_APP_INSTANCE_INFO.id);
    });
  });

  describe("Node events", () => {
    it("can unsubscribe from events", async done => {
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

    it("can subscribe to rejectInstall events", async () => {
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
  });

  describe("AppInstance management", () => {
    it("can expose the same AppInstance instance for a unique app instance ID", async () => {
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

    it("can load app instance details on-demand", async () => {
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
      const detailsRequest = nodeProvider
        .postedMessages[0] as Node.MethodRequest;
      expect(detailsRequest.type).toBe(
        Node.MethodName.GET_APP_INSTANCE_DETAILS
      );
      expect(
        (detailsRequest.params as Node.GetAppInstanceDetailsParams)
          .appInstanceId
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
  });
});
