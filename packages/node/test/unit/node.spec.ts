import { Node } from "../../src/node";
import { EMPTY_NETWORK } from "../integration/utils";
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
      EMPTY_NETWORK,
      nodeConfig
    );
    expect(node).toBeDefined();
  });
});
