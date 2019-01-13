import { Node } from "../../src/node";
import { EMPTY_NETWORK } from "../integration/utils";
import mockMessagingService from "../services/mock-messaging-service";
import mockStoreService from "../services/mock-store-service";

describe("Primitive Node operations", () => {
  it("exists", () => {
    expect(Node).toBeDefined();
  });

  it("can be instantiated", () => {
    const nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_PREFIX_KEY!
    };
    const node = new Node(
      process.env.A_PRIVATE_KEY!,
      mockMessagingService,
      mockStoreService,
      EMPTY_NETWORK,
      nodeConfig
    );
    expect(node).toBeDefined();
  });
});
