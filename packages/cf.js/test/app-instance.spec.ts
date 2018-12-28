import { AppInstanceInfo, AssetType, Node } from "@counterfactual/types";
import { bigNumberify } from "ethers/utils";

import { Provider } from "../src";
import { AppInstance, AppInstanceEventType } from "../src/app-instance";
import { ErrorEventData, UpdateStateEventData } from "../src/types";

import { TestNodeProvider } from "./fixture";

describe("CF.js AppInstance", () => {
  let nodeProvider: TestNodeProvider;
  let provider: Provider;
  let appInstance: AppInstance;

  const TEST_APP_INSTANCE_INFO: AppInstanceInfo = {
    id: "TEST_ID",
    asset: { assetType: AssetType.ETH },
    abiEncodings: { actionEncoding: "uint256", stateEncoding: "uint256" },
    appId: "0x1515151515151515151515151515151515151515",
    myDeposit: bigNumberify(1000),
    peerDeposit: bigNumberify(1000),
    timeout: bigNumberify(10)
  };

  beforeEach(async () => {
    nodeProvider = new TestNodeProvider();
    provider = new Provider(nodeProvider);
    appInstance = await provider.getOrCreateAppInstance(
      TEST_APP_INSTANCE_INFO.id,
      TEST_APP_INSTANCE_INFO
    );
  });

  describe("Node methods", () => {
    it("can retrieve the latest state", async () => {
      expect.assertions(3);

      const expectedState = "4000";
      nodeProvider.onMethodRequest(Node.MethodName.GET_STATE, request => {
        expect(request.type).toBe(Node.MethodName.GET_STATE);
        const params = request.params as Node.GetStateParams;
        expect(params.appInstanceId).toBe(appInstance.id);
        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.GET_STATE,
          requestId: request.requestId,
          result: {
            state: expectedState
          }
        });
      });

      const state = await appInstance.getState();
      expect(state).toBe(expectedState);
    });

    it("can take an action", async () => {
      expect.assertions(4);
      const expectedAction = "1337";
      const expectedNewState = "5337";
      nodeProvider.onMethodRequest(Node.MethodName.TAKE_ACTION, request => {
        expect(request.type).toBe(Node.MethodName.TAKE_ACTION);
        const params = request.params as Node.TakeActionParams;
        expect(params.appInstanceId).toBe(appInstance.id);
        expect(params.action).toBe(expectedAction);

        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.TAKE_ACTION,
          requestId: request.requestId,
          result: {
            newState: expectedNewState
          }
        });
      });

      const newState = await appInstance.takeAction(expectedAction);
      expect(newState).toBe(expectedNewState);
    });

    it("can be uninstalled", async () => {
      expect.assertions(2);

      nodeProvider.onMethodRequest(Node.MethodName.UNINSTALL, request => {
        expect(request.type).toBe(Node.MethodName.UNINSTALL);
        const params = request.params as Node.UninstallParams;
        expect(params.appInstanceId).toBe(appInstance.id);

        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.UNINSTALL,
          requestId: request.requestId,
          result: {}
        });
      });

      await appInstance.uninstall();
    });
  });

  describe("Node events", () => {
    it("fires update state events", async () => {
      expect.assertions(4);

      const expectedOldState = bigNumberify(1000);
      const expectedAction = bigNumberify(200);
      const expectedNewState = bigNumberify(1200);
      appInstance.on(AppInstanceEventType.UPDATE_STATE, event => {
        expect(event.type).toBe(AppInstanceEventType.UPDATE_STATE);
        const {
          oldState,
          newState,
          action
        } = event.data as UpdateStateEventData;
        expect(action).toBe(expectedAction);
        expect(oldState).toBe(expectedOldState);
        expect(newState).toBe(expectedNewState);
      });

      nodeProvider.simulateMessageFromNode({
        type: Node.EventName.UPDATE_STATE,
        data: {
          action: expectedAction,
          oldState: expectedOldState,
          newState: expectedNewState,
          appInstanceId: TEST_APP_INSTANCE_INFO.id
        }
      });
    });

    it("fires uninstall events", async () => {
      expect.assertions(1);

      appInstance.on(AppInstanceEventType.UNINSTALL, event => {
        expect(event.type).toBe(AppInstanceEventType.UNINSTALL);
      });

      nodeProvider.simulateMessageFromNode({
        type: Node.EventName.UNINSTALL,
        data: {
          appInstance: TEST_APP_INSTANCE_INFO
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
        type: Node.ErrorType.ERROR,
        data: {
          errorName: expectedErrorName,
          message: expectedMessage,
          appInstanceId: TEST_APP_INSTANCE_INFO.id
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
        type: Node.EventName.UPDATE_STATE,
        data: {
          action: "200",
          oldState: "1000",
          newState: "1200",
          appInstanceId: TEST_APP_INSTANCE_INFO.id
        }
      };
      nodeProvider.simulateMessageFromNode(event);
      nodeProvider.simulateMessageFromNode(event);
      setTimeout(done, 50);
    });

    it("can unsubscribe from events", done => {
      const callback = () => done.fail();
      appInstance.on(AppInstanceEventType.UNINSTALL, callback);
      appInstance.off(AppInstanceEventType.UNINSTALL, callback);
      nodeProvider.simulateMessageFromNode({
        type: Node.EventName.UNINSTALL,
        data: {
          appInstance: TEST_APP_INSTANCE_INFO
        }
      });
      setTimeout(done, 50);
    });
  });
});
