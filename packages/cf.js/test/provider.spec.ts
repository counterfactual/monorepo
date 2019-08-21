import { AppInstanceInfo, Node } from "@counterfactual/types";
import { Zero } from "ethers/constants";
import { JsonRpcNotification, JsonRpcResponse } from "rpc-server";

import { AppInstance } from "../src/app-instance";
import { NODE_REQUEST_TIMEOUT, Provider } from "../src/provider";
import {
  ErrorEventData,
  EventType,
  InstallEventData,
  RejectInstallEventData
} from "../src/types";

import {
  CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  TEST_XPUBS,
  TestNodeProvider
} from "./fixture";

describe("CF.js Provider", () => {
  let nodeProvider: TestNodeProvider;
  let provider: Provider;

  const TEST_APP_INSTANCE_INFO: AppInstanceInfo = {
    identityHash: "TEST_ID",
    abiEncodings: { actionEncoding: "uint256", stateEncoding: "uint256" },
    appDefinition: "0x1515151515151515151515151515151515151515",
    initiatorDeposit: Zero,
    responderDeposit: Zero,
    timeout: Zero,
    proposedByIdentifier: TEST_XPUBS[0],
    proposedToIdentifier: TEST_XPUBS[1],
    initiatorDepositTokenAddress: CONVENTION_FOR_ETH_TOKEN_ADDRESS,
    responderDepositTokenAddress: CONVENTION_FOR_ETH_TOKEN_ADDRESS
  };

  beforeEach(() => {
    nodeProvider = new TestNodeProvider();
    provider = new Provider(nodeProvider);
  });

  it("throws generic errors coming from Node", async () => {
    expect.assertions(1);

    nodeProvider.onMethodRequest(
      Node.RpcMethodName.GET_APP_INSTANCES,
      request => {
        nodeProvider.simulateMessageFromNode({
          jsonrpc: "2.0",
          id: request.id as number,
          result: {
            type: Node.ErrorType.ERROR,
            data: { errorName: "music_too_loud", message: "Music too loud" }
          }
        });
      }
    );

    try {
      await provider.getAppInstances();
    } catch (e) {
      expect(e.result.data.message).toBe("Music too loud");
    }
  });

  it("emits an error event for orphaned responses", async () => {
    expect.assertions(2);
    provider.on(EventType.ERROR, e => {
      expect(e.type).toBe(EventType.ERROR);
      expect((e.data as ErrorEventData).errorName).toBe("orphaned_response");
    });
    nodeProvider.simulateMessageFromNode({
      jsonrpc: "2.0",
      result: {
        type: Node.RpcMethodName.INSTALL,
        result: {
          appInstanceId: ""
        }
      },
      id: 3
    });
  });

  it(
    "throws an error on timeout",
    async () => {
      try {
        await provider.getAppInstances();
      } catch (err) {
        expect(err.data.errorName).toBe("request_timeout");
      }
    },
    NODE_REQUEST_TIMEOUT + 1000 // This could be done with fake timers.
  );

  // Test disabled until event type validations are refactored.
  it.skip("throws an error for unexpected event types", async () => {
    expect.assertions(2);

    provider.on(EventType.ERROR, e => {
      expect(e.type).toBe(EventType.ERROR);
      expect((e.data as ErrorEventData).errorName).toBe(
        "unexpected_event_type"
      );
    });

    // @ts-ignore Ignoring compiler on purpose to simulate an invalid event type.
    provider.callRawNodeMethod("notARealEventType", {});
  });

  // Test disabled until event type validations are refactored.
  it.skip("throws an error when subscribing to an unknown event", async () => {
    expect.assertions(3);

    ["on", "once", "off"].forEach(methodName => {
      expect(() => provider[methodName]("fakeEvent", () => {})).toThrowError(
        '"fakeEvent" is not a valid event'
      );
    });
  });

  describe("Node methods", () => {
    it("can query app instances and return them", async () => {
      expect.assertions(3);
      nodeProvider.onMethodRequest(
        Node.RpcMethodName.GET_APP_INSTANCES,
        request => {
          expect(request.methodName).toBe(Node.RpcMethodName.GET_APP_INSTANCES);

          nodeProvider.simulateMessageFromNode({
            jsonrpc: "2.0",
            result: {
              type: Node.RpcMethodName.GET_APP_INSTANCES,
              result: {
                appInstances: [TEST_APP_INSTANCE_INFO]
              }
            },
            id: request.id as number
          });
        }
      );

      const instances = await provider.getAppInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].identityHash).toBe(
        TEST_APP_INSTANCE_INFO.identityHash
      );
    });

    it("can install an app instance", async () => {
      expect.assertions(4);
      nodeProvider.onMethodRequest(Node.RpcMethodName.INSTALL, request => {
        expect(request.methodName).toBe(Node.RpcMethodName.INSTALL);
        expect((request.parameters as Node.InstallParams).appInstanceId).toBe(
          TEST_APP_INSTANCE_INFO.identityHash
        );
        nodeProvider.simulateMessageFromNode({
          jsonrpc: "2.0",
          result: {
            result: {
              appInstance: TEST_APP_INSTANCE_INFO
            },
            type: Node.RpcMethodName.INSTALL
          },
          id: request.id as number
        });
      });
      const appInstance = await provider.install(
        TEST_APP_INSTANCE_INFO.identityHash
      );
      expect(appInstance.identityHash).toBe(
        TEST_APP_INSTANCE_INFO.identityHash
      );
      expect(appInstance.appDefinition).toBe(
        TEST_APP_INSTANCE_INFO.appDefinition
      );
    });

    it("can install an app instance virtually", async () => {
      expect.assertions(7);
      const expectedHubIdentifier =
        "0x6001600160016001600160016001600160016001";

      nodeProvider.onMethodRequest(
        Node.RpcMethodName.INSTALL_VIRTUAL,
        request => {
          expect(request.methodName).toBe(Node.RpcMethodName.INSTALL_VIRTUAL);
          const params = request.parameters as Node.InstallVirtualParams;
          expect(params.appInstanceId).toBe(
            TEST_APP_INSTANCE_INFO.identityHash
          );
          expect(params.intermediaryIdentifier).toBe(expectedHubIdentifier);

          nodeProvider.simulateMessageFromNode({
            jsonrpc: "2.0",
            result: {
              result: {
                appInstance: {
                  intermediaryIdentifier: expectedHubIdentifier,
                  ...TEST_APP_INSTANCE_INFO
                }
              },
              type: Node.RpcMethodName.INSTALL_VIRTUAL
            },
            id: request.id as number
          });
        }
      );
      const appInstance = await provider.installVirtual(
        TEST_APP_INSTANCE_INFO.identityHash,
        expectedHubIdentifier
      );
      expect(appInstance.identityHash).toBe(
        TEST_APP_INSTANCE_INFO.identityHash
      );
      expect(appInstance.appDefinition).toBe(
        TEST_APP_INSTANCE_INFO.appDefinition
      );
      expect(appInstance.isVirtual).toBeTruthy();
      expect(appInstance.intermediaryIdentifier).toBe(expectedHubIdentifier);
    });

    it("can reject installation proposals", async () => {
      nodeProvider.onMethodRequest(
        Node.RpcMethodName.REJECT_INSTALL,
        request => {
          expect(request.methodName).toBe(Node.RpcMethodName.REJECT_INSTALL);
          const {
            appInstanceId
          } = request.parameters as Node.RejectInstallParams;
          expect(appInstanceId).toBe(TEST_APP_INSTANCE_INFO.identityHash);
          nodeProvider.simulateMessageFromNode({
            jsonrpc: "2.0",
            result: {
              type: Node.RpcMethodName.REJECT_INSTALL,
              result: {}
            },
            id: request.id as number
          });
        }
      );
      await provider.rejectInstall(TEST_APP_INSTANCE_INFO.identityHash);
    });
  });

  describe("Node events", () => {
    it("can unsubscribe from events", async done => {
      const callback = () => done.fail("Unsubscribed event listener was fired");
      provider.on(EventType.REJECT_INSTALL, callback);
      provider.off(EventType.REJECT_INSTALL, callback);
      nodeProvider.simulateMessageFromNode({
        jsonrpc: "2.0",
        result: {
          result: {
            appInstanceId: "TEST"
          },
          type: Node.RpcMethodName.REJECT_INSTALL
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
        expect(appInstance.identityHash).toBe(
          TEST_APP_INSTANCE_INFO.identityHash
        );
      });
      nodeProvider.simulateMessageFromNode({
        jsonrpc: "2.0",
        result: {
          type: Node.EventName.REJECT_INSTALL,
          data: {
            appInstance: TEST_APP_INSTANCE_INFO
          }
        }
      });
    });

    it("can subscribe to install events", async () => {
      expect.assertions(3);
      provider.once(EventType.INSTALL, e => {
        expect(e.type).toBe(EventType.INSTALL);
        const appInstance = (e.data as InstallEventData).appInstance;
        expect(appInstance).toBeInstanceOf(AppInstance);
        expect(appInstance.identityHash).toBe(
          TEST_APP_INSTANCE_INFO.identityHash
        );
      });

      await provider.getOrCreateAppInstance(
        TEST_APP_INSTANCE_INFO.identityHash,
        TEST_APP_INSTANCE_INFO
      );

      nodeProvider.simulateMessageFromNode({
        jsonrpc: "2.0",
        result: {
          type: Node.EventName.INSTALL,
          data: {
            appInstanceId: TEST_APP_INSTANCE_INFO.identityHash
          }
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
        jsonrpc: "2.0",
        result: {
          type: Node.EventName.REJECT_INSTALL,
          data: {
            appInstance: TEST_APP_INSTANCE_INFO
          }
        }
      } as JsonRpcNotification;

      nodeProvider.simulateMessageFromNode(msg);
      nodeProvider.simulateMessageFromNode(msg);
    });

    it("can load app instance details on-demand", async () => {
      expect.assertions(4);

      provider.on(EventType.UPDATE_STATE, e => {
        expect((e.data as InstallEventData).appInstance.identityHash).toBe(
          TEST_APP_INSTANCE_INFO.identityHash
        );
      });

      nodeProvider.simulateMessageFromNode({
        jsonrpc: "2.0",
        result: {
          type: Node.EventName.UPDATE_STATE,
          data: {
            appInstanceId: TEST_APP_INSTANCE_INFO.identityHash,
            newState: { someState: "3" }
          }
        }
      });
      expect(nodeProvider.postedMessages).toHaveLength(1);
      const [detailsRequest] = nodeProvider.postedMessages;
      expect(detailsRequest.methodName).toBe(
        Node.RpcMethodName.GET_APP_INSTANCE_DETAILS
      );
      expect(
        (detailsRequest.parameters as Node.GetAppInstanceDetailsParams)
          .appInstanceId
      ).toBe(TEST_APP_INSTANCE_INFO.identityHash);
      nodeProvider.simulateMessageFromNode({
        jsonrpc: "2.0",
        result: {
          type: Node.RpcMethodName.GET_APP_INSTANCE_DETAILS,
          result: {
            appInstance: TEST_APP_INSTANCE_INFO
          }
        },
        id: detailsRequest.id
      } as JsonRpcResponse);
      // NOTE: For some reason the event won't fire unless we wait for a bit
      await new Promise(r => setTimeout(r, 50));
    });
  });
});
