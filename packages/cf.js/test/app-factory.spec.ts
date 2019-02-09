import { AssetType, Node } from "@counterfactual/types";
import { parseEther } from "ethers/utils";

import { AppFactory } from "../src/app-factory";
import { Provider } from "../src/provider";

import { TEST_XPUBS, TestNodeProvider } from "./fixture";

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

      const expectedDeposit = parseEther("0.5");
      const expectedState = "4000";
      const expectedAppInstanceId = "TEST_ID";

      nodeProvider.onMethodRequest(Node.MethodName.PROPOSE_INSTALL, request => {
        expect(request.type).toBe(Node.MethodName.PROPOSE_INSTALL);
        const params = request.params as Node.ProposeInstallParams;
        expect(params.initialState).toBe(expectedState);
        expect(params.myDeposit).toEqual(expectedDeposit);
        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.PROPOSE_INSTALL,
          requestId: request.requestId,
          result: {
            appInstanceId: expectedAppInstanceId
          }
        });
      });
      const appInstanceId = await appFactory.proposeInstall({
        proposedToIdentifier: TEST_XPUBS[0],
        asset: {
          assetType: AssetType.ETH
        },
        peerDeposit: expectedDeposit,
        myDeposit: expectedDeposit,
        timeout: "100",
        initialState: expectedState
      });
      expect(appInstanceId).toBe(expectedAppInstanceId);
    });

    it("can propose valid virtual app installs", async () => {
      expect.assertions(5);

      const expectedDeposit = parseEther("0.5");
      const expectedState = "4000";
      const expectedAppInstanceId = "TEST_ID";
      const expectedIntermediaries = [TEST_XPUBS[1]];

      nodeProvider.onMethodRequest(
        Node.MethodName.PROPOSE_INSTALL_VIRTUAL,
        request => {
          expect(request.type).toBe(Node.MethodName.PROPOSE_INSTALL_VIRTUAL);
          const params = request.params as Node.ProposeInstallVirtualParams;
          expect(params.initialState).toBe(expectedState);
          expect(params.intermediaries).toBe(expectedIntermediaries);
          expect(params.myDeposit).toEqual(expectedDeposit);
          nodeProvider.simulateMessageFromNode({
            type: Node.MethodName.PROPOSE_INSTALL_VIRTUAL,
            requestId: request.requestId,
            result: {
              appInstanceId: expectedAppInstanceId
            }
          });
        }
      );
      const appInstanceId = await appFactory.proposeInstallVirtual({
        proposedToIdentifier: TEST_XPUBS[0],
        asset: {
          assetType: AssetType.ETH
        },
        peerDeposit: expectedDeposit,
        myDeposit: expectedDeposit,
        timeout: "100",
        initialState: expectedState,
        intermediaries: expectedIntermediaries
      });
      expect(appInstanceId).toBe(expectedAppInstanceId);
    });

    it("throws an error if BigNumber param invalid", async done => {
      try {
        await appFactory.proposeInstall({
          proposedToIdentifier: TEST_XPUBS[0],
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
