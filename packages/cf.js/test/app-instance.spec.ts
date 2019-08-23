import { AppInstanceInfo, Node } from "@counterfactual/types";
import { bigNumberify } from "ethers/utils";
import { JsonRpcResponse } from "rpc-server";

import { Provider } from "../src";
import { AppInstance, AppInstanceEventType } from "../src/app-instance";
import { ErrorEventData, UpdateStateEventData } from "../src/types";

import {
  CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  TEST_XPUBS,
  TestNodeProvider
} from "./fixture";

describe("CF.js AppInstance", () => {
  let nodeProvider: TestNodeProvider;
  let provider: Provider;
  let appInstance: AppInstance;

  const TEST_APP_INSTANCE_INFO: AppInstanceInfo = {
    identityHash: "TEST_ID",
    abiEncodings: { actionEncoding: "uint256", stateEncoding: "uint256" },
    appDefinition: "0x1515151515151515151515151515151515151515",
    initiatorDeposit: bigNumberify(1000),
    responderDeposit: bigNumberify(1000),
    timeout: bigNumberify(10),
    proposedByIdentifier: TEST_XPUBS[0],
    proposedToIdentifier: TEST_XPUBS[1],
    initiatorDepositTokenAddress: CONVENTION_FOR_ETH_TOKEN_ADDRESS,
    responderDepositTokenAddress: CONVENTION_FOR_ETH_TOKEN_ADDRESS
  };

  beforeEach(async () => {
    nodeProvider = new TestNodeProvider();
    provider = new Provider(nodeProvider);
    appInstance = await provider.getOrCreateAppInstance(
      TEST_APP_INSTANCE_INFO.identityHash,
      TEST_APP_INSTANCE_INFO
    );
  });

  describe("Node methods", () => {
    it("can retrieve the latest state", async () => {
      expect.assertions(3);

      const expectedState = { someState: "4000" };
      nodeProvider.onMethodRequest(Node.RpcMethodName.GET_STATE, request => {
        expect(request.methodName).toBe(Node.RpcMethodName.GET_STATE);
        const params = request.parameters as Node.GetStateParams;
        expect(params.appInstanceId).toBe(appInstance.identityHash);
        nodeProvider.simulateMessageFromNode({
          jsonrpc: "2.0",
          result: {
            type: Node.RpcMethodName.GET_STATE,
            result: {
              state: expectedState
            }
          },
          id: request.id as number
        });
      });

      const state = await appInstance.getState();
      expect(state).toBe(expectedState);
    });

    it("can take an action", async () => {
      expect.assertions(4);
      const expectedAction = { action: "1337" };
      const expectedNewState = { val: "5337" };
      nodeProvider.onMethodRequest(Node.RpcMethodName.TAKE_ACTION, request => {
        expect(request.methodName).toBe(Node.RpcMethodName.TAKE_ACTION);
        const params = request.parameters as Node.TakeActionParams;
        expect(params.appInstanceId).toBe(appInstance.identityHash);
        expect(params.action).toBe(expectedAction);

        nodeProvider.simulateMessageFromNode({
          jsonrpc: "2.0",
          result: {
            type: Node.RpcMethodName.TAKE_ACTION,
            result: {
              newState: expectedNewState
            }
          },
          id: request.id as number
        });
      });

      const newState = await appInstance.takeAction(expectedAction);
      expect(newState).toBe(expectedNewState);
    });

    it("can be uninstalled", async () => {
      expect.assertions(2);

      nodeProvider.onMethodRequest(Node.RpcMethodName.UNINSTALL, request => {
        expect(request.methodName).toBe(Node.RpcMethodName.UNINSTALL);
        const params = request.parameters as Node.UninstallParams;
        expect(params.appInstanceId).toBe(appInstance.identityHash);

        nodeProvider.simulateMessageFromNode({
          jsonrpc: "2.0",
          result: {
            type: Node.RpcMethodName.UNINSTALL,
            result: {}
          },
          id: request.id as number
        });
      });

      await appInstance.uninstall();
    });
  });

  describe("Node events", () => {
    it("fires update state events", async () => {
      expect.assertions(3);

      const expectedAction = { a: 1 };
      const expectedNewState = { val: bigNumberify(1200) };

      appInstance.on(AppInstanceEventType.UPDATE_STATE, event => {
        expect(event.type).toBe(AppInstanceEventType.UPDATE_STATE);
        const { newState, action } = event.data as UpdateStateEventData;
        expect(action).toBe(expectedAction);
        expect(newState).toBe(expectedNewState);
      });

      nodeProvider.simulateMessageFromNode({
        jsonrpc: "2.0",
        result: {
          type: Node.EventName.UPDATE_STATE,
          data: {
            action: expectedAction,
            newState: expectedNewState,
            appInstanceId: TEST_APP_INSTANCE_INFO.identityHash
          }
        }
      });
    });

    it("fires uninstall events", async () => {
      expect.assertions(1);

      appInstance.on(AppInstanceEventType.UNINSTALL, event => {
        expect(event.type).toBe(AppInstanceEventType.UNINSTALL);
      });

      nodeProvider.simulateMessageFromNode({
        jsonrpc: "2.0",
        result: {
          type: Node.EventName.UNINSTALL,
          data: {
            appInstanceId: TEST_APP_INSTANCE_INFO.identityHash
          }
        }
      });
    });

    it("fires error events", async () => {
      expect.assertions(3);
      const expectedErrorName = "app_instance_crash";
      const expectedMessage = "App instance crashed!";

      appInstance.on(AppInstanceEventType.ERROR, event => {
        expect(event.type).toBe(AppInstanceEventType.ERROR);
        const { errorName, message } = event.data as ErrorEventData;
        expect(errorName).toBe(expectedErrorName);
        expect(message).toBe(expectedMessage);
      });

      nodeProvider.simulateMessageFromNode({
        jsonrpc: "2.0",
        result: {
          type: Node.ErrorType.ERROR,
          data: {
            errorName: expectedErrorName,
            message: expectedMessage,
            appInstanceId: TEST_APP_INSTANCE_INFO.identityHash
          }
        }
      });
    });

    it("fires events once when subscribing with .once()", done => {
      expect.assertions(1);
      let onceTriggered = false;
      appInstance.once(AppInstanceEventType.UPDATE_STATE, event => {
        if (!onceTriggered) {
          expect(event.type).toBe(AppInstanceEventType.UPDATE_STATE);
          onceTriggered = true;
        } else {
          done.fail(".once() listener was triggered twice");
        }
      });
      const event = {
        jsonrpc: "2.0",
        result: {
          type: Node.EventName.UPDATE_STATE,
          data: {
            action: "200",
            newState: "1200",
            appInstanceId: TEST_APP_INSTANCE_INFO.identityHash
          }
        }
      } as JsonRpcResponse;
      nodeProvider.simulateMessageFromNode(event);
      nodeProvider.simulateMessageFromNode(event);
      setTimeout(done, 50);
    });

    it("can unsubscribe from events", done => {
      const callback = () => done.fail();
      appInstance.on(AppInstanceEventType.UNINSTALL, callback);
      appInstance.off(AppInstanceEventType.UNINSTALL, callback);
      nodeProvider.simulateMessageFromNode({
        jsonrpc: "2.0",
        result: {
          type: Node.EventName.UNINSTALL,
          data: {
            appInstance: TEST_APP_INSTANCE_INFO
          }
        }
      });
      setTimeout(done, 50);
    });

    it("throws an error when subscribing to an unknown event", async () => {
      expect.assertions(3);

      ["on", "once", "off"].forEach(methodName => {
        expect(() =>
          appInstance[methodName]("fakeEvent", () => {})
        ).toThrowError(new Error('"fakeEvent" is not a valid event'));
      });
    });
  });
});
