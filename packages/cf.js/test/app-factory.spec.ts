import {
  NodeMessageType,
  NodeProposeInstallData
} from "@counterfactual/node-provider";
import * as ethers from "ethers";

import { BlockchainAssetType } from "../src/app-types";
import { Provider } from "../src/provider";

import { TestNodeProvider } from "./fixture";

describe("App Factory", async () => {
  const TEST_APP_DEFINITION = {
    address: ethers.constants.AddressZero,
    appActionEncoding: "tuple(uint256 increase)",
    appStateEncoding: "tuple(uint256 val)"
  };
  let nodeProvider: TestNodeProvider;
  let provider: Provider;

  beforeEach(() => {
    nodeProvider = new TestNodeProvider();
    provider = new Provider(nodeProvider);
  });

  it("should instantiate", () => {
    provider.createAppFactory(TEST_APP_DEFINITION);
  });

  it("should deliver valid app install proposals to the counterparty (using promises)", async () => {
    const TEST_APP_INSTANCE_ID = "TEST_ID";
    expect.assertions(3);

    nodeProvider.listenForMessage(0, message => {
      expect(message.messageType).toBe(NodeMessageType.PROPOSE_INSTALL);

      const messageData = message.data as NodeProposeInstallData;
      expect(messageData.appDefinition.address === TEST_APP_DEFINITION.address);

      return {
        requestId: message.requestId,
        messageType: NodeMessageType.PROPOSE_INSTALL,
        data: {
          appInstanceId: TEST_APP_INSTANCE_ID,
          ...messageData
        }
      };
    });

    const appFactory = provider.createAppFactory(TEST_APP_DEFINITION);
    const appInstanceId = await appFactory.proposeInstall({
      peerAddress: "0x1111111111111111111111111111111111111111",
      asset: { assetType: BlockchainAssetType.ETH },
      myDeposit: ethers.utils.parseEther("1.0"),
      peerDeposit: ethers.utils.parseEther("1.0"),
      initialState: {
        val: "0"
      }
    });
    expect(appInstanceId).toBe(TEST_APP_INSTANCE_ID);
  });
});
