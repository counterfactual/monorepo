import { AssetType, Node } from "@counterfactual/common-types";
import { ethers } from "ethers";

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
    it("should correctly propose valid app installs", async () => {
      expect.assertions(4);
      nodeProvider.onMethodRequest(Node.MethodName.PROPOSE_INSTALL, request => {
        expect(request.type).toBe(Node.MethodName.PROPOSE_INSTALL);
        const params = request.params as Node.ProposeInstallParams;
        expect(params.initialState).toBe("1559");
        expect(params.myDeposit).toEqual(ethers.utils.parseEther("0.5"));
        nodeProvider.simulateMessageFromNode({
          type: Node.MethodName.PROPOSE_INSTALL,
          requestId: request.requestId,
          result: {
            appInstanceId: "TEST_ID"
          }
        });
      });
      const appInstanceId = await appFactory.proposeInstall({
        peerAddress: "0x0101010101010101010101010101010101010101",
        asset: {
          assetType: AssetType.ETH
        },
        peerDeposit: ethers.utils.parseEther("0.5"),
        myDeposit: ethers.utils.parseEther("0.5"),
        timeout: "100",
        initialState: "1559"
      });
      expect(appInstanceId).toBe("TEST_ID");
    });

    it("should throw an error if peer address invalid", async done => {
      try {
        await appFactory.proposeInstall({
          peerAddress: "$%GARBAGE$%",
          asset: {
            assetType: AssetType.ETH
          },
          peerDeposit: ethers.utils.parseEther("0.5"),
          myDeposit: ethers.utils.parseEther("0.5"),
          timeout: "100",
          initialState: "1559"
        });
        done.fail("Expected an error for invalid peer address");
      } catch (e) {
        expect(e.data.errorName).toBe("invalid_peer_address");
        done();
      }
    });
  });

  it("should throw an error if deposit amount invalid", async done => {
    try {
      await appFactory.proposeInstall({
        peerAddress: "0x0101010101010101010101010101010101010101",
        asset: {
          assetType: AssetType.ETH
        },
        peerDeposit: ethers.utils.parseEther("0.5"),
        myDeposit: "$%GARBAGE$%",
        timeout: "100",
        initialState: "1559"
      });
      done.fail("Expected an error for invalid myDeposit");
    } catch (e) {
      done();
    }
  });
});
