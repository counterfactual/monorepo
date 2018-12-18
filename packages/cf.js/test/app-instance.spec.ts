import { AppInstanceInfo, AssetType, Node } from "@counterfactual/common-types";
import { Zero } from "ethers/constants";
import { BigNumber, bigNumberify } from "ethers/utils";

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
    myDeposit: new BigNumber("1000"),
    peerDeposit: new BigNumber("1000"),
    timeout: new BigNumber("100")
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

      const testState = "4000";
      nodeProvider.onMethodRequest(Node.MethodName.GET_STATE, request => {
        expect(request.type).toBe(Node.MethodName.GET_STATE);
        const params = request.params as Node.GetStateParams;
        expect(params.appInstanceId).toBe(appInstance.id);
        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.GET_STATE,
          requestId: request.requestId,
          result: {
            state: testState
          }
        });
      });

      const state = await appInstance.getState();
      expect(state).toBe(testState);
    });

    it("can take an action", async () => {
      expect.assertions(4);
      const testAction = "1337";
      const testNewState = "5337";
      nodeProvider.onMethodRequest(Node.MethodName.TAKE_ACTION, request => {
        expect(request.type).toBe(Node.MethodName.TAKE_ACTION);
        const params = request.params as Node.TakeActionParams;
        expect(params.appInstanceId).toBe(appInstance.id);
        expect(params.action).toBe(testAction);

        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.TAKE_ACTION,
          requestId: request.requestId,
          result: {
            newState: testNewState
          }
        });
      });

      const newState = await appInstance.takeAction(testAction);
      expect(newState).toBe(testNewState);
    });

    it("can be uninstalled", async () => {
      expect.assertions(2);

      const testMyPayout = bigNumberify(2000);
      const testPeerPayout = Zero;

      nodeProvider.onMethodRequest(Node.MethodName.UNINSTALL, request => {
        expect(request.type).toBe(Node.MethodName.UNINSTALL);
        const params = request.params as Node.UninstallParams;
        expect(params.appInstanceId).toBe(appInstance.id);

        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.UNINSTALL,
          requestId: request.requestId,
          result: {
            myPayout: testMyPayout,
            peerPayout: testPeerPayout
          }
        });
      });

      await appInstance.uninstall();
    });
  });

  describe("Node events", () => {
    it("fires update state events", async () => {
      expect.assertions(4);

      const testOldState = bigNumberify(1000);
      const testAction = bigNumberify(200);
      const testNewState = bigNumberify(1200);
      appInstance.on(AppInstanceEventType.UPDATE_STATE, event => {
        expect(event.type).toBe(AppInstanceEventType.UPDATE_STATE);
        const {
          oldState,
          newState,
          action
        } = event.data as UpdateStateEventData;
        expect(action).toBe(testAction);
        expect(oldState).toBe(testOldState);
        expect(newState).toBe(testNewState);
      });

      nodeProvider.simulateMessageFromNode({
        type: Node.EventName.UPDATE_STATE,
        data: {
          action: testAction,
          oldState: testOldState,
          newState: testNewState,
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
          myPayout: Zero,
          peerPayout: Zero,
          appInstance: TEST_APP_INSTANCE_INFO
        }
      });
    });

    it("fires error events", async () => {
      expect.assertions(3);
      const testErrorName = "app_instance_crash";
      const testMessage = "App instance crashed!";

      appInstance.on(AppInstanceEventType.ERROR, event => {
        expect(event.type).toBe(AppInstanceEventType.ERROR);
        const { errorName, message } = event.data as ErrorEventData;
        expect(errorName).toBe(testErrorName);
        expect(message).toBe(testMessage);
      });

      nodeProvider.simulateMessageFromNode({
        type: Node.ErrorType.ERROR,
        data: {
          errorName: testErrorName,
          message: testMessage,
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
          appInstance: TEST_APP_INSTANCE_INFO,
          myPayout: Zero,
          peerPayout: Zero
        }
      });
      setTimeout(done, 50);
    });
  });
});
