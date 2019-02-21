import { JsonRpcProvider } from "ethers/providers";

import { Node } from "../../src/node";
import { TEST_NETWORK } from "../integration/utils";
import memoryStoreService from "../services/memory-store-service";
import mockMessagingService from "../services/mock-messaging-service";

describe("Primitive Node operations", () => {
  it("exists", () => {
    expect(Node).toBeDefined();
  });

  it("can be instantiated", async () => {
    const provider = new JsonRpcProvider(global["ganacheURL"]);

    const nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_PREFIX_KEY!
    };
    const node = await Node.create(
      mockMessagingService,
      memoryStoreService,
      nodeConfig,
      provider,
      TEST_NETWORK,
      global["networkContext"]
    );
    expect(node).toBeDefined();
  });
});
