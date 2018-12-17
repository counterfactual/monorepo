import { AppInstanceInfo, AssetType, Node } from "@counterfactual/common-types";
import { ethers } from "ethers";
import { BigNumber } from "ethers/utils";

import { Provider } from "../src";
import { AppInstance } from "../src/app-instance";

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

      const testMyPayout = new BigNumber("2000");
      const testPeerPayout = ethers.constants.Zero;

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
});
