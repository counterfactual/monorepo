import { JsonRpcProvider } from "ethers/providers";

import { Node } from "../../src/node";
import { EMPTY_NETWORK, TEST_NETWORK } from "../integration/utils";
import memoryStoreService from "../services/memory-store-service";
import mockMessagingService from "../services/mock-messaging-service";

describe("Primitive Node operations", () => {
  it("exists", () => {
    expect(Node).toBeDefined();
  });

  it("can be instantiated", async () => {
    const nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_PREFIX_KEY!
    };
    const node = await Node.create(
      mockMessagingService,
      memoryStoreService,
      nodeConfig,
      // fake provider as nothing is listening on this URL
      new JsonRpcProvider("localhost:8545"),
      TEST_NETWORK,
      EMPTY_NETWORK
    );
    expect(node).toBeDefined();
  });
});
