import { AssetType, Node } from "@counterfactual/common-types";
import { ethers } from "ethers";

import { AppFactory } from "../src/app-factory";
import { Provider } from "../src/provider";

import { TEST_APP, TestNodeProvider } from "./fixture";

describe("CF.js AppFactory", async () => {
  let nodeProvider: TestNodeProvider;
  let provider: Provider;
  let appFactory: AppFactory;

  beforeEach(() => {
    nodeProvider = new TestNodeProvider();
    provider = new Provider(nodeProvider);
    appFactory = new AppFactory(
      TEST_APP.appId,
      TEST_APP.abiEncodings,
      provider
    );
  });

  it("should propose installations of app instances", async () => {
    expect.assertions(4);
    const initialState = "1559";
    const testAppInstanceId = "TEST_ID";
    nodeProvider.onMethodRequest(Node.MethodName.PROPOSE_INSTALL, request => {
      expect(request.type).toBe(Node.MethodName.PROPOSE_INSTALL);
      const params = request.params as Node.ProposeInstallParams;
      expect(params.initialState).toBe(initialState);
      expect(params.myDeposit.toString()).toBe(
        ethers.utils.parseEther("0.5").toString()
      );
      nodeProvider.simulateMessageFromNode({
        type: Node.MethodName.PROPOSE_INSTALL,
        requestId: request.requestId,
        result: {
          appInstanceId: testAppInstanceId
        }
      });
    });
    const appInstanceId = await appFactory.proposeInstall({
      initialState,
      peerAddress: "0xwhatever",
      asset: {
        assetType: AssetType.ETH
      },
      peerDeposit: ethers.utils.parseEther("0.5"),
      myDeposit: ethers.utils.parseEther("0.5"),
      timeout: "100"
    });
    expect(appInstanceId).toBe(testAppInstanceId);
  });
});
