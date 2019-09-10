import { JsonRpcProvider } from "ethers/providers";

import { Node } from "../../src/node";
import { MemoryLockService } from "../services/memory-lock-service";
import { MemoryStoreService } from "../services/memory-store-service";
import mockMessagingService from "../services/mock-messaging-service";

describe("Node", () => {
  it("is defined", () => {
    expect(Node).toBeDefined();
  });

  it("can be created", async () => {
    const node = await Node.create(
      mockMessagingService,
      new MemoryStoreService(),
      new MemoryLockService(),
      { STORE_KEY_PREFIX: "./node.spec.ts-test-file" },
      new JsonRpcProvider(global["ganacheURL"]),
      global["networkContext"]
    );

    expect(node).toBeDefined();
  });
});
