import { AssetType, Node } from "@counterfactual/types";
import { parseEther } from "ethers/utils";

import { AppFactory } from "../src/app-factory";
import { Provider } from "../src/provider";

import { TestNodeProvider } from "./fixture";

const TEST_APP = {
  abiEncodings: { actionEncoding: "uint256", stateEncoding: "uint256" },
  appId: "0x1515151515151515151515151515151515151515"
};

describe("CF.js AppFactory", () => {
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

  describe("proposeInstall()", () => {
    it("can propose valid app installs", async () => {
      expect.assertions(4);

      const testState = "4000";
      const testAppInstanceId = "TEST_ID";

      nodeProvider.onMethodRequest(Node.MethodName.PROPOSE_INSTALL, request => {
        expect(request.type).toBe(Node.MethodName.PROPOSE_INSTALL);
        const params = request.params as Node.ProposeInstallParams;
        expect(params.initialState).toBe(testState);
        expect(params.myDeposit).toEqual(parseEther("0.5"));
        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.PROPOSE_INSTALL,
          requestId: request.requestId,
          result: {
            appInstanceId: testAppInstanceId
          }
        });
      });
      const appInstanceId = await appFactory.proposeInstall({
        peerAddress: "0x0101010101010101010101010101010101010101",
        asset: {
          assetType: AssetType.ETH
        },
        peerDeposit: parseEther("0.5"),
        myDeposit: parseEther("0.5"),
        timeout: "100",
        initialState: testState
      });
      expect(appInstanceId).toBe(testAppInstanceId);
    });

    it("throws an error if BigNumber param invalid", async done => {
      try {
        await appFactory.proposeInstall({
          peerAddress: "0x0101010101010101010101010101010101010101",
          asset: {
            assetType: AssetType.ETH
          },
          peerDeposit: parseEther("0.5"),
          myDeposit: "$%GARBAGE$%",
          timeout: "100",
          initialState: "4000"
        });
        done.fail("Expected an error for invalid myDeposit");
      } catch (e) {
        expect(e.data.errorName).toBe("invalid_param");
        expect(e.data.extra.paramName).toBe("myDeposit");
        done();
      }
    });
  });
});
